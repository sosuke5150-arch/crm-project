const express = require('express');
const router  = express.Router();
const PptxGenJS = require('pptxgenjs');
const db = require('../db');

// ========== カラーパレット ==========
const CLR = {
  primary:  '1F3864',
  accent:   '2E75B6',
  accentL:  '9DC3E6',
  white:    'FFFFFF',
  bg:       'F0F2F5',
  rowAlt:   'EEF4FB',
  textD:    '1A2332',
  textM:    '4A5568',
  textL:    '64748B',
  green:    '375623',
  greenBg:  'E2EFDA',
  red:      'C00000',
  redBg:    'FCE4D6',
  orange:   'C55A11',
  gold:     '7F6000',
  purple:   '7030A0',
  headerBg: '1F497D',
  subHdr:   '2F5597',
};

const STATUS_LABELS = {
  proposing:'提案中', planned:'提案予定', won:'受注',
  developing:'開発中', shikakake:'仕掛計上',
  monthly:'月額', done:'完了', forecast:'見込', open:'オープン',
};

const MONTH_ORDER  = ['9月','10月','11月','12月','1月','2月','3月','4月','5月','6月','7月','8月'];
const UPPER_MONTHS = ['9月','10月','11月','12月','1月','2月'];
const LOWER_MONTHS = ['3月','4月','5月','6月','7月','8月'];
const ACT_STS  = new Set(['won','done','monthly','shikakake']);
const FORE_STS = new Set(['forecast','developing']);

const fmt  = v => Number(v||0).toLocaleString();
const fmtM = v => `¥${(Number(v||0)/10000).toFixed(0)}万`;

// ---------- ヘルパー ----------
function addFrame(pptx, sl, title) {
  sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.75, fill:{color:CLR.primary} });
  sl.addShape(pptx.ShapeType.rect, { x:0, y:0.75, w:13.33, h:0.06, fill:{color:CLR.accent} });
  sl.addText(title, { x:0.4, y:0, w:10.0, h:0.75, fontSize:20, bold:true, color:CLR.white, valign:'middle' });
  sl.addText('25期 受託開発案件', { x:10.0, y:0, w:3.2, h:0.75, fontSize:9, color:CLR.accentL, valign:'middle', align:'right' });
}

const hCell = (text, align='center') => ({
  text, options:{ bold:true, fill:{color:CLR.primary}, color:CLR.white, align, fontSize:10, valign:'middle' },
});
const hCellSub = (text, align='center') => ({
  text, options:{ bold:true, fill:{color:CLR.subHdr}, color:CLR.white, align, fontSize:10, valign:'middle' },
});
const cell = (text, opts={}) => ({
  text, options:{ fontSize:10, color:CLR.textD, valign:'middle', ...opts },
});

// 現在月・前月を inspection_date の形式（"3月"等）で取得
function getCurrentAndPrevMonth() {
  const now = new Date();
  const curM = now.getMonth() + 1; // 1-indexed
  const prevM = curM === 1 ? 12 : curM - 1;
  return {
    curLabel:  `${curM}月`,
    prevLabel: `${prevM}月`,
  };
}

// ========== GET /export-ppt ==========
router.get('/', async (req, res) => {
  try {
    // ----- データ取得 -----
    const deals = db.prepare(`
      SELECT d.*, c.company as customer_name
      FROM deals d LEFT JOIN customers c ON d.customer_id = c.id
    `).all();

    const targetRows = db.prepare('SELECT t.*, c.company as customer_name FROM targets t LEFT JOIN customers c ON t.customer_id = c.id').all();

    // targets map: customer_id_month -> amount
    const targetsMap = {};
    targetRows.forEach(r => { targetsMap[`${r.customer_id}_${r.month}`] = r.amount; });

    // 月別実績/見込集計
    const monthMap = {};
    MONTH_ORDER.forEach(m => { monthMap[m] = { actual:0, forecast:0 }; });
    deals.forEach(d => {
      if (!d.inspection_date) return;
      const m = MONTH_ORDER.find(mo => d.inspection_date.includes(mo));
      if (!m) return;
      if (ACT_STS.has(d.status))  monthMap[m].actual   += Number(d.amount)||0;
      if (FORE_STS.has(d.status)) monthMap[m].forecast += Number(d.amount)||0;
    });

    // 顧客別実績集計
    const custMap = {};
    deals.filter(d => ACT_STS.has(d.status)).forEach(d => {
      const n = d.customer_name || '不明';
      custMap[n] = (custMap[n]||0) + (Number(d.amount)||0);
    });
    const byCustomer = Object.entries(custMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a,b) => b.total - a.total);

    // 集計値
    const totalActual   = deals.filter(d=>ACT_STS.has(d.status)).reduce((s,d)=>s+(Number(d.amount)||0),0);
    const totalForecast = deals.filter(d=>FORE_STS.has(d.status)).reduce((s,d)=>s+(Number(d.amount)||0),0);
    const totalTarget   = targetRows.reduce((s,r)=>s+(Number(r.amount)||0),0);

    // inspection_dateが "12月" を含む場合に "2月" と誤マッチしないよう、MONTH_ORDERで正規化してから判定
    const getMonth = ds => MONTH_ORDER.find(m => (ds||'').includes(m));
    const inM = (ds, months) => { const m = getMonth(ds); return m !== undefined && months.includes(m); };
    const sumD = (sts, months) => deals.filter(d=>sts.has(d.status)&&inM(d.inspection_date,months)).reduce((s,d)=>s+(Number(d.amount)||0),0);
    const sumT = months => targetRows.filter(r=>months.includes(r.month)).reduce((s,r)=>s+(Number(r.amount)||0),0);

    const uActual=sumD(ACT_STS,UPPER_MONTHS), uTarget=sumT(UPPER_MONTHS);
    const lActual=sumD(ACT_STS,LOWER_MONTHS), lForecast=sumD(FORE_STS,LOWER_MONTHS), lTarget=sumT(LOWER_MONTHS);

    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
    const { curLabel, prevLabel } = getCurrentAndPrevMonth();
    const TOTAL = 8;

    // ----- PPT 生成 -----
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // ===================================================================
    // Slide 1: 表紙
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5,  fill:{color:CLR.primary} });
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.45, fill:{color:'0D1F40'} });
      sl.addShape(pptx.ShapeType.rect, { x:0, y:6.85, w:13.33, h:0.35, fill:{color:CLR.accent} });
      sl.addShape(pptx.ShapeType.rect, { x:0, y:7.2,  w:13.33, h:0.3,  fill:{color:CLR.accentL} });
      sl.addText('25期 受託開発案件', { x:1, y:1.7,  w:11.33, h:1.6, fontSize:44, bold:true, color:CLR.white, align:'center' });
      sl.addText('月次進捗報告',       { x:1, y:3.45, w:11.33, h:0.9, fontSize:28, color:CLR.accentL, align:'center' });
      sl.addShape(pptx.ShapeType.rect, { x:3.5, y:4.55, w:6.33, h:0.05, fill:{color:CLR.accent} });
      sl.addText(dateStr, { x:1, y:4.75, w:11.33, h:0.5, fontSize:14, color:CLR.accentL, align:'center' });
    }

    // ===================================================================
    // Slide 2: 案件サマリーダッシュボード
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '案件サマリー');

      // --- KPI カード（上段3枚）---
      const rate = totalTarget > 0 ? Math.round((totalActual+totalForecast)/totalTarget*100) : 0;
      const rC   = rate>=100 ? CLR.green : rate>=80 ? CLR.gold : CLR.red;
      const kpis = [
        { label:'確定売上（実績）', val:fmtM(totalActual),            sub:`¥${fmt(totalActual)}`, color:CLR.accent },
        { label:'着地予想（実績＋見込）', val:fmtM(totalActual+totalForecast), sub:`¥${fmt(totalActual+totalForecast)}`, color:CLR.orange },
        { label:'目標達成率',       val:`${rate}%`,                  sub:fmtM(totalTarget)+'（目標）', color:rC },
      ];
      kpis.forEach((k, i) => {
        const x = 0.4 + i * 4.3;
        sl.addShape(pptx.ShapeType.rect, { x, y:0.95, w:4.0, h:1.7, fill:{color:CLR.white}, line:{color:CLR.accentL, width:1.5} });
        sl.addShape(pptx.ShapeType.rect, { x, y:0.95, w:4.0, h:0.12, fill:{color:k.color} });
        sl.addText(k.label, { x:x+0.12, y:0.95, w:3.76, h:0.5, fontSize:9, color:CLR.textM, valign:'middle' });
        sl.addText(k.val,   { x:x+0.12, y:1.45, w:3.76, h:0.85, fontSize:28, bold:true, color:k.color, align:'center', valign:'middle' });
        sl.addText(k.sub,   { x:x+0.12, y:2.3,  w:3.76, h:0.3,  fontSize:8, color:CLR.textL, align:'center' });
      });

      // --- 月別棒グラフ（左下）---
      const barLabels = MONTH_ORDER;
      const barActual   = MONTH_ORDER.map(m => Math.round((monthMap[m]?.actual   || 0) / 10000));
      const barForecast = MONTH_ORDER.map(m => Math.round((monthMap[m]?.forecast || 0) / 10000));
      const barTarget   = MONTH_ORDER.map(m => {
        const tot = targetRows.filter(r => r.month === m).reduce((s, r) => s + (Number(r.amount)||0), 0);
        return Math.round(tot / 10000);
      });

      sl.addChart(pptx.ChartType.bar, [
        { name:'目標',    labels:barLabels, values:barTarget },
        { name:'実績',    labels:barLabels, values:barActual },
        { name:'見込',    labels:barLabels, values:barForecast },
      ], {
        x:0.35, y:2.85, w:8.5, h:4.2,
        barDir:'col', barGrouping:'clustered',
        chartColors:['9DC3E6', '2E75B6', 'C55A11'],
        showLegend:true, legendPos:'t', legendFontSize:9,
        showValue:true, dataLabelFontSize:7,
        valAxisTitle:'万円', showValAxisTitle:false,
        valAxisMinVal:0,
        catAxisLabelFontSize:9,
      });

      // --- 顧客別円グラフ（右下）---
      const pieTop = byCustomer.slice(0, 5);
      const pieOther = byCustomer.slice(5).reduce((s,d)=>s+d.total,0);
      const pieLabels = pieTop.map(d=>d.name);
      const pieValues = pieTop.map(d=>Math.round(d.total/10000));
      if (pieOther > 0) { pieLabels.push('その他'); pieValues.push(Math.round(pieOther/10000)); }

      sl.addText('顧客別売上構成（実績）', { x:9.05, y:2.78, w:4.0, h:0.3, fontSize:9, bold:true, color:CLR.textM });
      sl.addChart(pptx.ChartType.pie, [
        { name:'顧客別', labels:pieLabels, values:pieValues },
      ], {
        x:9.0, y:3.0, w:4.15, h:4.0,
        showLegend:true, legendPos:'b', legendFontSize:8,
        showPercent:true, dataLabelFontSize:8,
        chartColors:['2E75B6','375623','C55A11','7030A0','7F6000','4A5568'],
      });
    }

    // ===================================================================
    // Slide 3: 売上管理表（顧客別×月別 目標/実績/見込）
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '売上管理表');

      // ---- 顧客リスト（targetsに登録された顧客、sort_order順）----
      const custList = [];
      const seenCids = new Set();
      db.prepare(`SELECT DISTINCT t.customer_id, c.company as name, c.sort_order
                  FROM targets t LEFT JOIN customers c ON t.customer_id = c.id
                  ORDER BY c.sort_order`).all().forEach(r => {
        if (!seenCids.has(r.customer_id)) {
          seenCids.add(r.customer_id);
          custList.push({ id: r.customer_id, name: r.name || '不明' });
        }
      });

      const NC = custList.length;
      const allMonths = [...UPPER_MONTHS, ...LOWER_MONTHS];

      // 顧客×月の集計ヘルパー
      const custTarget   = (cid, m) => targetRows.filter(r=>r.customer_id===cid&&r.month===m).reduce((s,r)=>s+(Number(r.amount)||0),0);
      const custActual   = (cid, m) => deals.filter(d=>d.customer_id===cid&&ACT_STS.has(d.status)&&getMonth(d.inspection_date)===m).reduce((s,d)=>s+(Number(d.amount)||0),0);
      const custForecast = (cid, m) => deals.filter(d=>d.customer_id===cid&&FORE_STS.has(d.status)&&getMonth(d.inspection_date)===m).reduce((s,d)=>s+(Number(d.amount)||0),0);

      // 行高・フォントサイズを動的計算
      // 行数: 2ヘッダー + 3セクション×(NC+1)行 + 2差異行
      const totalRows3 = 2 + (NC + 1) * 3 + 2;
      const availH3 = 7.5 - 0.81 - 0.25;
      const rH = Math.max(0.26, Math.min(0.38, availH3 / totalRows3));
      const fS = rH < 0.30 ? 6 : rH < 0.34 ? 7 : 8;

      // カラム幅: [区分, 顧客, 9月×6, 上計, 3月×6, 下計, 合計] = 17列
      const colW3 = [0.42, 1.5, ...Array(6).fill(0.67), 0.82, ...Array(6).fill(0.67), 0.82, 0.88];
      const totalW3 = colW3.reduce((s,v)=>s+v,0);

      // セルヘルパー
      const mH = (txt, bg, col, opts={}) => ({
        text: txt, options:{ fontSize:fS, bold:true, color:col||CLR.white, fill:{color:bg||CLR.primary}, align:'center', valign:'middle', ...opts }
      });
      const mC = (txt, bg, col, opts={}) => ({
        text: txt, options:{ fontSize:fS, color:col||CLR.textD, fill:{color:bg||CLR.white}, align:'right', valign:'middle', ...opts }
      });
      const mL = (txt, bg, col, opts={}) => ({
        text: txt, options:{ fontSize:fS, color:col||CLR.textD, fill:{color:bg||CLR.white}, align:'left', valign:'middle', ...opts }
      });

      // 金額表示（¥付き）
      const yen = v => v !== 0 ? `¥${fmt(v)}` : '¥0';
      const diff3 = (v, bg) => ({
        text: v !== 0 ? `${v>0?'+':''}¥${fmt(v)}` : '¥0',
        options:{ fontSize:fS, bold:true, color:v>0?CLR.green:v<0?CLR.red:CLR.textL, fill:{color:bg}, align:'right', valign:'middle' }
      });

      // ---- ヘッダー行1（年/上下期ラベル）----
      const P = (n) => Array(n).fill({ text:'', options:{fill:{color:CLR.primary}} });
      const hdr1 = [
        mH('受託開発', CLR.primary, CLR.white, { colSpan:2, bold:true }),
        { text:'', options:{fill:{color:CLR.primary}} }, // colSpan placeholder
        mH('上 期（2025年 9月〜2月）', CLR.subHdr, CLR.white, { colSpan:7 }),
        ...P(6),
        mH('下 期（2026年 3月〜8月）', 'C55A11', CLR.white, { colSpan:7 }),
        ...P(6),
        mH('合計', CLR.primary, CLR.white),
      ];

      // ---- ヘッダー行2（月名）----
      const hdr2 = [
        mH('区分', CLR.primary, CLR.white),
        mH('顧客', CLR.primary, CLR.white, { align:'left' }),
        ...UPPER_MONTHS.map(m => mH(m, CLR.primary, CLR.white)),
        mH('小計', CLR.primary, CLR.white),
        ...LOWER_MONTHS.map(m => mH(m, '8B4513', CLR.white)),
        mH('小計', '8B4513', CLR.white),
        mH('合計', CLR.primary, CLR.white),
      ];

      const tableRows3 = [hdr1, hdr2];

      // ---- セクション行生成 ----
      const buildSection3 = (sectionLabel, getVal, bgRow, bgTotal, labelColor) => {
        const rows = [];
        custList.forEach((cust, ci) => {
          const vals = allMonths.map(m => getVal(cust.id, m));
          const uSum = vals.slice(0,6).reduce((s,v)=>s+v,0);
          const lSum = vals.slice(6,12).reduce((s,v)=>s+v,0);
          const tot  = uSum + lSum;
          const isFirst = ci === 0;
          rows.push([
            // 区分ラベル: 最初の行のみ表示（背景同色）
            mL(isFirst ? sectionLabel : '', bgRow, labelColor, { bold:isFirst, align:'center', rowSpan: isFirst ? (NC+1) : undefined }),
            mL(cust.name, bgRow, CLR.textD),
            ...vals.slice(0,6).map(v => mC(yen(v), bgRow, labelColor)),
            mC(yen(uSum), bgRow, labelColor, { bold:true }),
            ...vals.slice(6,12).map(v => mC(yen(v), bgRow, labelColor)),
            mC(yen(lSum), bgRow, labelColor, { bold:true }),
            mC(yen(tot),  bgRow, labelColor, { bold:true }),
          ]);
        });
        // 合計行
        const totVals = allMonths.map(m => custList.reduce((s,c)=>s+getVal(c.id,m),0));
        const totU = totVals.slice(0,6).reduce((s,v)=>s+v,0);
        const totL = totVals.slice(6,12).reduce((s,v)=>s+v,0);
        rows.push([
          mL('', bgTotal, CLR.textD),
          mL('合 計', bgTotal, CLR.textD, { bold:true }),
          ...totVals.slice(0,6).map(v => mC(yen(v), bgTotal, labelColor, { bold:true })),
          mC(yen(totU), bgTotal, labelColor, { bold:true }),
          ...totVals.slice(6,12).map(v => mC(yen(v), bgTotal, labelColor, { bold:true })),
          mC(yen(totL), bgTotal, labelColor, { bold:true }),
          mC(yen(totU+totL), bgTotal, labelColor, { bold:true }),
        ]);
        return rows;
      };

      // 目標セクション
      tableRows3.push(...buildSection3('目\n標', custTarget,   'EEF2FF', 'DDEEFF', '6D6D6D'));
      // 実績差異行
      {
        const dVals = allMonths.map(m => {
          const tgt = custList.reduce((s,c)=>s+custTarget(c.id,m),0);
          const act = custList.reduce((s,c)=>s+custActual(c.id,m),0);
          return act - tgt;
        });
        const dU = dVals.slice(0,6).reduce((s,v)=>s+v,0);
        const dL = dVals.slice(6,12).reduce((s,v)=>s+v,0);
        tableRows3.push([
          mC('実績差異', 'E8E8E8', CLR.orange, { colSpan:2, bold:true, align:'center' }),
          { text:'', options:{fill:{color:'E8E8E8'}} },
          ...dVals.slice(0,6).map(v => diff3(v, v>=0?CLR.greenBg:CLR.redBg)),
          diff3(dU, dU>=0?CLR.greenBg:CLR.redBg),
          ...dVals.slice(6,12).map(v => diff3(v, v>=0?CLR.greenBg:CLR.redBg)),
          diff3(dL, dL>=0?CLR.greenBg:CLR.redBg),
          diff3(dU+dL, (dU+dL)>=0?CLR.greenBg:CLR.redBg),
        ]);
      }
      // 実績セクション
      tableRows3.push(...buildSection3('実\n績', custActual,   'EEF8FF', 'DDF0FF', CLR.accent));
      // 見込セクション
      tableRows3.push(...buildSection3('見\n込', custForecast, 'FFF8EE', 'FFEEDD', CLR.orange));
      // 実績+見込差異行
      {
        const dVals = allMonths.map(m => {
          const tgt  = custList.reduce((s,c)=>s+custTarget(c.id,m),0);
          const act  = custList.reduce((s,c)=>s+custActual(c.id,m),0);
          const fore = custList.reduce((s,c)=>s+custForecast(c.id,m),0);
          return act + fore - tgt;
        });
        const dU = dVals.slice(0,6).reduce((s,v)=>s+v,0);
        const dL = dVals.slice(6,12).reduce((s,v)=>s+v,0);
        tableRows3.push([
          mC('実績+見込差異', 'E8E8E8', CLR.orange, { colSpan:2, bold:true, align:'center' }),
          { text:'', options:{fill:{color:'E8E8E8'}} },
          ...dVals.slice(0,6).map(v => diff3(v, v>=0?CLR.greenBg:CLR.redBg)),
          diff3(dU, dU>=0?CLR.greenBg:CLR.redBg),
          ...dVals.slice(6,12).map(v => diff3(v, v>=0?CLR.greenBg:CLR.redBg)),
          diff3(dL, dL>=0?CLR.greenBg:CLR.redBg),
          diff3(dU+dL, (dU+dL)>=0?CLR.greenBg:CLR.redBg),
        ]);
      }

      sl.addTable(tableRows3, { x:0.18, y:0.9, w:totalW3, colW:colW3, rowH:rH, border:{type:'solid',color:'C8D3E0',pt:0.3} });
    }

    // ===================================================================
    // Slide 4: 前月売上実績
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, `前月（${prevLabel}）売上実績`);

      const prevDeals = deals
        .filter(d => ACT_STS.has(d.status) && getMonth(d.inspection_date) === prevLabel)
        .sort((a,b) => (a.sort_order||0)-(b.sort_order||0));

      if (prevDeals.length === 0) {
        sl.addText(`${prevLabel}の売上実績はありません`, { x:1, y:3.0, w:11.33, h:0.6, fontSize:14, color:CLR.textL, align:'center' });
      } else {
        const rows = [[hCell('顧客','left'), hCell('プロジェクト名','left'), hCell('金額','right'), hCell('ステータス','center'), hCell('備考','left')]];
        let total = 0;
        prevDeals.forEach((d, i) => {
          const bg = i%2===0 ? CLR.white : 'F2F7FC';
          total += Number(d.amount)||0;
          const isShikakake = d.status === 'shikakake';
          rows.push([
            cell(d.customer_name||'', { fill:{color:bg}, color:CLR.accent, fontWeight:600, fontSize:10 }),
            cell(d.title||'',         { fill:{color:bg}, color:CLR.textD, fontSize:10 }),
            cell(`¥${fmt(d.amount)}`, { fill:{color:bg}, align:'right', color:CLR.textD, fontSize:10 }),
            cell(STATUS_LABELS[d.status]||d.status, { fill:{color:bg}, align:'center', color:CLR.textM, fontSize:10 }),
            cell(isShikakake ? '仕掛計上' : (d.topics||''), { fill:{color:bg}, color:CLR.textL, fontSize:9 }),
          ]);
        });
        rows.push([
          cell(`合計  ${prevDeals.length}件`, { fill:{color:CLR.rowAlt}, bold:true, align:'right', color:CLR.textM, fontSize:10 }),
          cell('', { fill:{color:CLR.rowAlt} }),
          cell(`¥${fmt(total)}`, { fill:{color:CLR.rowAlt}, align:'right', bold:true, color:CLR.accent, fontSize:11 }),
          cell('', { fill:{color:CLR.rowAlt} }),
          cell('', { fill:{color:CLR.rowAlt} }),
        ]);
        sl.addTable(rows, { x:0.4, y:0.95, w:12.5, colW:[2.2,5.0,1.9,1.6,1.8], rowH:0.42, border:{type:'solid',color:'C8D3E0',pt:0.5} });
      }
    }

    // ===================================================================
    // Slide 5: 当月売上予測
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, `当月（${curLabel}）売上予測`);

      const curDeals = deals
        .filter(d => (ACT_STS.has(d.status)||FORE_STS.has(d.status)) && getMonth(d.inspection_date) === curLabel)
        .sort((a,b) => {
          // 実績先、見込後
          const ao = ACT_STS.has(a.status) ? 0 : 1;
          const bo = ACT_STS.has(b.status) ? 0 : 1;
          if (ao !== bo) return ao - bo;
          return (a.sort_order||0)-(b.sort_order||0);
        });

      if (curDeals.length === 0) {
        sl.addText(`${curLabel}の案件はありません`, { x:1, y:3.0, w:11.33, h:0.6, fontSize:14, color:CLR.textL, align:'center' });
      } else {
        const rows = [[hCell('顧客','left'), hCell('プロジェクト名','left'), hCell('金額','right'), hCell('ステータス','center'), hCell('備考','left')]];
        let actualTotal = 0, forecastTotal = 0;
        curDeals.forEach((d, i) => {
          const isFore = FORE_STS.has(d.status);
          const bg = isFore ? 'FFF4EC' : (i%2===0 ? CLR.white : 'F2F7FC');
          if (ACT_STS.has(d.status)) actualTotal += Number(d.amount)||0;
          else forecastTotal += Number(d.amount)||0;
          rows.push([
            cell(d.customer_name||'', { fill:{color:bg}, color:CLR.accent, fontWeight:600, fontSize:10 }),
            cell(d.title||'',         { fill:{color:bg}, color:isFore?CLR.orange:CLR.textD, fontSize:10 }),
            cell(`¥${fmt(d.amount)}`, { fill:{color:bg}, align:'right', color:isFore?CLR.orange:CLR.textD, fontSize:10 }),
            cell(STATUS_LABELS[d.status]||d.status, { fill:{color:bg}, align:'center', color:isFore?CLR.orange:CLR.textM, bold:isFore, fontSize:10 }),
            cell(d.topics||'', { fill:{color:bg}, color:CLR.textL, fontSize:9 }),
          ]);
        });
        const combined = actualTotal + forecastTotal;
        rows.push([
          cell(`実績 ${fmt(actualTotal)}　見込 ${fmt(forecastTotal)}`, { fill:{color:CLR.rowAlt}, align:'right', color:CLR.textM, fontSize:9 }),
          cell('', { fill:{color:CLR.rowAlt} }),
          cell(`¥${fmt(combined)}`, { fill:{color:CLR.rowAlt}, align:'right', bold:true, color:CLR.accent, fontSize:11 }),
          cell('', { fill:{color:CLR.rowAlt} }),
          cell('', { fill:{color:CLR.rowAlt} }),
        ]);
        sl.addTable(rows, { x:0.4, y:0.95, w:12.5, colW:[2.2,5.0,1.9,1.6,1.8], rowH:0.42, border:{type:'solid',color:'C8D3E0',pt:0.5} });
        sl.addText('※ オレンジ色は見込案件', { x:0.4, y:7.1, w:6, h:0.22, fontSize:8, color:CLR.orange, italic:true });
      }
    }

    // ===================================================================
    // Slide 6: 上期売上一覧
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '上期　売上一覧');

      const upperDeals = deals
        .filter(d => ACT_STS.has(d.status) && d.inspection_date && UPPER_MONTHS.some(m=>d.inspection_date.includes(m)))
        .sort((a,b) => {
          const ma = UPPER_MONTHS.findIndex(m=>a.inspection_date.includes(m));
          const mb = UPPER_MONTHS.findIndex(m=>b.inspection_date.includes(m));
          if (ma !== mb) return ma - mb;
          return (a.sort_order||0)-(b.sort_order||0);
        });

      const uBudget = sumT(UPPER_MONTHS);
      const uTotal  = upperDeals.reduce((s,d)=>s+(Number(d.amount)||0),0);
      const uDiff   = uTotal - uBudget;

      if (upperDeals.length === 0) {
        sl.addText('上期の売上実績はありません', { x:1, y:3.0, w:11.33, h:0.6, fontSize:14, color:CLR.textL, align:'center' });
      } else {
        const rows = [[hCell('顧客','left'), hCell('プロジェクト名','left'), hCell('金額','right'), hCell('検収','center'), hCell('備考','center')]];
        upperDeals.forEach((d,i) => {
          const bg = i%2===0 ? CLR.white : 'F2F7FC';
          const isShikakake = d.status === 'shikakake';
          const isNew = d.topics && d.topics.toUpperCase().includes('NEW');
          rows.push([
            cell(d.customer_name||'', { fill:{color:bg}, color:CLR.accent, fontWeight:600, fontSize:10 }),
            cell(d.title||'',         { fill:{color:bg}, color:CLR.textD, fontSize:10 }),
            cell(`¥${fmt(d.amount)}`, { fill:{color:bg}, align:'right', color:CLR.textD, fontSize:10 }),
            cell(d.inspection_date||'-', { fill:{color:bg}, align:'center', color:CLR.textM, fontSize:10 }),
            cell(isShikakake?'仕掛計上': isNew?'NEW':'', { fill:{color:bg}, align:'center', color:isShikakake?CLR.orange:CLR.green, bold:true, fontSize:9 }),
          ]);
        });
        // フッター
        rows.push([
          cell('上期売上合計', { fill:{color:CLR.rowAlt}, bold:true, align:'right', color:CLR.textM, fontSize:10 }),
          cell('', { fill:{color:CLR.rowAlt} }),
          cell(`¥${fmt(uTotal)}`, { fill:{color:CLR.rowAlt}, align:'right', bold:true, color:CLR.accent, fontSize:11 }),
          cell('', { fill:{color:CLR.rowAlt} }), cell('', { fill:{color:CLR.rowAlt} }),
        ]);
        rows.push([
          cell('上期予算', { fill:{color:'EEF4FB'}, bold:true, align:'right', color:CLR.textM, fontSize:10 }),
          cell('', { fill:{color:'EEF4FB'} }),
          cell(`¥${fmt(uBudget)}`, { fill:{color:'EEF4FB'}, align:'right', bold:true, color:CLR.textM, fontSize:11 }),
          cell('', { fill:{color:'EEF4FB'} }), cell('', { fill:{color:'EEF4FB'} }),
        ]);
        rows.push([
          cell('差 異', { fill:{color:uDiff>=0?CLR.greenBg:CLR.redBg}, bold:true, align:'right', color:CLR.textM, fontSize:10 }),
          cell('', { fill:{color:uDiff>=0?CLR.greenBg:CLR.redBg} }),
          cell(`${uDiff>=0?'+':''}¥${fmt(uDiff)}`, { fill:{color:uDiff>=0?CLR.greenBg:CLR.redBg}, align:'right', bold:true, color:uDiff>=0?CLR.green:CLR.red, fontSize:11 }),
          cell('', { fill:{color:uDiff>=0?CLR.greenBg:CLR.redBg} }), cell('', { fill:{color:uDiff>=0?CLR.greenBg:CLR.redBg} }),
        ]);
        sl.addTable(rows, { x:0.4, y:0.95, w:12.5, colW:[2.3,6.0,1.9,1.4,0.9], rowH:0.38, border:{type:'solid',color:'C8D3E0',pt:0.5} });
      }
    }

    // ===================================================================
    // Slide 7: 下期売上一覧
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '下期　売上一覧（実績＋見込）');

      const lowerDeals = deals
        .filter(d => (ACT_STS.has(d.status)||FORE_STS.has(d.status)) && d.inspection_date && LOWER_MONTHS.some(m=>d.inspection_date.includes(m)))
        .sort((a,b) => {
          const ma = LOWER_MONTHS.findIndex(m=>a.inspection_date.includes(m));
          const mb = LOWER_MONTHS.findIndex(m=>b.inspection_date.includes(m));
          if (ma !== mb) return ma - mb;
          return (a.sort_order||0)-(b.sort_order||0);
        });

      const lBudget  = sumT(LOWER_MONTHS);
      const lTotal   = lowerDeals.reduce((s,d)=>s+(Number(d.amount)||0),0);
      const lDiffVal = lTotal - lBudget;

      if (lowerDeals.length === 0) {
        sl.addText('下期の売上データはありません', { x:1, y:3.0, w:11.33, h:0.6, fontSize:14, color:CLR.textL, align:'center' });
      } else {
        const rows = [[hCell('顧客','left'), hCell('プロジェクト名','left'), hCell('金額','right'), hCell('検収','center'), hCell('備考','center')]];
        lowerDeals.forEach((d,i) => {
          const isFore = FORE_STS.has(d.status);
          const bg = isFore ? 'FFF4EC' : (i%2===0 ? CLR.white : 'F2F7FC');
          const isShikakake = d.status === 'shikakake';
          const isNew = d.topics && d.topics.toUpperCase().includes('NEW');
          rows.push([
            cell(d.customer_name||'', { fill:{color:bg}, color:CLR.accent, fontWeight:600, fontSize:10 }),
            cell(d.title||'',         { fill:{color:bg}, color:isFore?CLR.orange:CLR.textD, fontSize:10 }),
            cell(`¥${fmt(d.amount)}`, { fill:{color:bg}, align:'right', color:isFore?CLR.orange:CLR.textD, fontSize:10 }),
            cell(d.inspection_date||'-', { fill:{color:bg}, align:'center', color:isFore?CLR.orange:CLR.textM, fontSize:10 }),
            cell(isShikakake?'仕掛計上': isFore?'見込': isNew?'NEW':'', { fill:{color:bg}, align:'center', color:isShikakake||isFore?CLR.orange:CLR.green, bold:true, fontSize:9 }),
          ]);
        });
        rows.push([
          cell('下期合計（実績＋見込）', { fill:{color:CLR.rowAlt}, bold:true, align:'right', color:CLR.textM, fontSize:10 }),
          cell('', { fill:{color:CLR.rowAlt} }),
          cell(`¥${fmt(lTotal)}`, { fill:{color:CLR.rowAlt}, align:'right', bold:true, color:CLR.accent, fontSize:11 }),
          cell('', { fill:{color:CLR.rowAlt} }), cell('', { fill:{color:CLR.rowAlt} }),
        ]);
        rows.push([
          cell('下期予算', { fill:{color:'EEF4FB'}, bold:true, align:'right', color:CLR.textM, fontSize:10 }),
          cell('', { fill:{color:'EEF4FB'} }),
          cell(`¥${fmt(lBudget)}`, { fill:{color:'EEF4FB'}, align:'right', bold:true, color:CLR.textM, fontSize:11 }),
          cell('', { fill:{color:'EEF4FB'} }), cell('', { fill:{color:'EEF4FB'} }),
        ]);
        rows.push([
          cell('差 異', { fill:{color:lDiffVal>=0?CLR.greenBg:CLR.redBg}, bold:true, align:'right', color:CLR.textM, fontSize:10 }),
          cell('', { fill:{color:lDiffVal>=0?CLR.greenBg:CLR.redBg} }),
          cell(`${lDiffVal>=0?'+':''}¥${fmt(lDiffVal)}`, { fill:{color:lDiffVal>=0?CLR.greenBg:CLR.redBg}, align:'right', bold:true, color:lDiffVal>=0?CLR.green:CLR.red, fontSize:11 }),
          cell('', { fill:{color:lDiffVal>=0?CLR.greenBg:CLR.redBg} }), cell('', { fill:{color:lDiffVal>=0?CLR.greenBg:CLR.redBg} }),
        ]);
        sl.addTable(rows, { x:0.4, y:0.95, w:12.5, colW:[2.3,6.0,1.9,1.4,0.9], rowH:0.38, border:{type:'solid',color:'C8D3E0',pt:0.5} });
        sl.addText('※ オレンジ色は見込案件', { x:0.4, y:7.1, w:6, h:0.22, fontSize:8, color:CLR.orange, italic:true });
      }
    }

    // ===================================================================
    // Slide 8: 予実対比（上期・下期・通期）
    // ===================================================================
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '予実対比（上期・下期・通期）');

      const periods = [
        { name:'上 期', budget:uTarget, actual:uActual, forecast:0 },
        { name:'下 期', budget:lTarget, actual:lActual, forecast:lForecast },
        { name:'通 期', budget:uTarget+lTarget, actual:uActual+lActual, forecast:lForecast },
      ];

      const rows = [[
        hCell('期', 'center'),
        hCell('予 算', 'right'),
        hCell('実 績', 'right'),
        hCell('見 込', 'right'),
        hCell('実績＋見込', 'right'),
        hCell('差 異', 'right'),
        hCell('達成率', 'right'),
      ]];
      periods.forEach((p, i) => {
        const tot  = p.actual + p.forecast;
        const diff = tot - p.budget;
        const rate = p.budget > 0 ? Math.round(tot/p.budget*100) : 0;
        const bg   = i === 2 ? CLR.rowAlt : (i%2===0 ? CLR.white : 'F2F7FC');
        rows.push([
          cell(p.name,                                           { fill:{color:bg}, align:'center', bold:true,  fontSize:15, color:CLR.textD }),
          cell(`¥${fmt(p.budget)}`,                             { fill:{color:bg}, align:'right',              fontSize:13, color:CLR.textM }),
          cell(`¥${fmt(p.actual)}`,                             { fill:{color:bg}, align:'right', bold:true,   fontSize:13, color:CLR.accent }),
          cell(p.forecast>0 ? `¥${fmt(p.forecast)}` : '—',    { fill:{color:bg}, align:'right',              fontSize:13, color:CLR.orange }),
          cell(`¥${fmt(tot)}`,                                  { fill:{color:bg}, align:'right', bold:true,   fontSize:13, color:CLR.textD }),
          cell(`${diff>=0?'+':''}¥${fmt(diff)}`,               { fill:{color:diff>=0?CLR.greenBg:CLR.redBg}, align:'right', bold:true, fontSize:13, color:diff>=0?CLR.green:CLR.red }),
          cell(`${rate}%`,                                       { fill:{color:bg}, align:'right', bold:true,   fontSize:15, color:rate>=100?CLR.green:rate>=80?CLR.gold:CLR.red }),
        ]);
      });
      sl.addTable(rows, { x:0.5, y:1.3, w:12.3, colW:[1.4,2.2,2.1,1.9,2.2,1.8,0.7], rowH:1.1, border:{type:'solid',color:'C8D3E0',pt:0.5} });

      // 月別予実グラフ
      const bLabels = MONTH_ORDER;
      const bTgt = MONTH_ORDER.map(m => Math.round(targetRows.filter(r=>r.month===m).reduce((s,r)=>s+(Number(r.amount)||0),0)/10000));
      const bAct = MONTH_ORDER.map(m => Math.round(deals.filter(d=>ACT_STS.has(d.status)&&inM(d.inspection_date,[m])).reduce((s,d)=>s+(Number(d.amount)||0),0)/10000));
      const bFore= MONTH_ORDER.map(m => Math.round(deals.filter(d=>FORE_STS.has(d.status)&&inM(d.inspection_date,[m])).reduce((s,d)=>s+(Number(d.amount)||0),0)/10000));

      sl.addChart(pptx.ChartType.bar, [
        { name:'予算', labels:bLabels, values:bTgt },
        { name:'実績', labels:bLabels, values:bAct },
        { name:'見込', labels:bLabels, values:bFore },
      ], {
        x:0.5, y:4.8, w:12.3, h:2.4,
        barDir:'col', barGrouping:'clustered',
        chartColors:['9DC3E6','2E75B6','C55A11'],
        showLegend:true, legendPos:'t', legendFontSize:9,
        showValue:true, dataLabelFontSize:7,
        valAxisMinVal:0,
        catAxisLabelFontSize:9,
      });
    }

    // ----- Content_Types.xmlのバグ修正（pptxgenjs v4の既知バグ） -----
    const rawBuffer = await pptx.write({ outputType: 'nodebuffer' });
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(rawBuffer);
    const actualFiles = new Set(Object.keys(zip.files).filter(f => !zip.files[f].dir).map(f => '/' + f));
    let ct = await zip.file('[Content_Types].xml').async('string');
    ct = ct.replace(/<Override [^>]*>/g, (match) => {
      const m = match.match(/PartName="([^"]+)"/);
      return (m && actualFiles.has(m[1])) ? match : '';
    });
    zip.file('[Content_Types].xml', ct);
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    // ----- レスポンス返却 -----
    const fn = `会議資料_${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="meeting.pptx"; filename*=UTF-8''${encodeURIComponent(fn)}`);
    res.send(buffer);

  } catch (err) {
    console.error('PPT生成エラー:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
