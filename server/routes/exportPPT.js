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
};

const STATUS_LABELS = {
  proposing:'提案中', planned:'提案予定', won:'受注',
  developing:'開発中', shikakake:'仕掛計上',
  monthly:'月額', done:'完了', forecast:'見込',
};
const STATUS_CLR = {
  won:CLR.green, developing:CLR.purple, shikakake:CLR.orange,
  forecast:CLR.red, monthly:CLR.accent, done:CLR.textM,
};

const MONTH_ORDER  = ['9月','10月','11月','12月','1月','2月','3月','4月','5月','6月','7月','8月'];
const UPPER_MONTHS = ['9月','10月','11月','12月','1月','2月'];
const LOWER_MONTHS = ['3月','4月','5月','6月','7月','8月'];

const fmt  = v => Number(v||0).toLocaleString();
const fmtM = v => `¥${(Number(v||0)/10000).toFixed(0)}万`;

// ---------- ヘルパー ----------
function addFrame(pptx, sl, title, pageNum, total) {
  sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.82, fill:{color:CLR.primary} });
  sl.addText(title, { x:0.45, y:0, w:10.5, h:0.82, fontSize:21, bold:true, color:CLR.white, valign:'middle' });
  sl.addText('25期 受託開発案件', { x:10.5, y:0, w:2.8, h:0.82, fontSize:9, color:CLR.accentL, valign:'middle', align:'right' });
  sl.addShape(pptx.ShapeType.rect, { x:0, y:7.35, w:13.33, h:0.15, fill:{color:CLR.accentL} });
  const d = new Date();
  const ds = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  sl.addText(`${ds}　${pageNum} / ${total}`, { x:0, y:7.28, w:13.1, h:0.22, fontSize:8, color:CLR.textL, align:'right', valign:'middle' });
}

const hCell = (text, align='center') => ({
  text, options:{ bold:true, fill:{color:CLR.primary}, color:CLR.white, align, fontSize:11, valign:'middle' },
});
const cell = (text, opts={}) => ({
  text, options:{ fontSize:11, color:CLR.textD, valign:'middle', ...opts },
});

// ========== GET /export-ppt ==========
router.get('/', async (req, res) => {
  try {
    // ----- データ取得 -----
    const deals = db.prepare(`
      SELECT d.*, c.company as customer_name
      FROM deals d LEFT JOIN customers c ON d.customer_id = c.id
    `).all();

    const targetRows = db.prepare('SELECT * FROM targets').all();
    const targets = {};
    targetRows.forEach(r => { targets[`${r.customer_id}_${r.month}`] = r.amount; });

    // summary
    const ACT_STS  = new Set(['won','done','monthly','shikakake']);
    const FORE_STS = new Set(['forecast','developing']);
    const dealCount     = deals.length;
    const doneCount     = deals.filter(d => ['done','monthly'].includes(d.status)).length;
    const forecastCount = deals.filter(d => FORE_STS.has(d.status)).length;
    const proposingCount= deals.filter(d => ['proposing','planned'].includes(d.status)).length;
    const totalAmount   = deals.filter(d => ACT_STS.has(d.status)).reduce((s,d)=>s+(Number(d.amount)||0),0);
    const totalForecast = deals.filter(d => FORE_STS.has(d.status)).reduce((s,d)=>s+(Number(d.amount)||0),0);
    const totalTarget   = targetRows.reduce((s,r)=>s+(Number(r.amount)||0),0);

    // by-month
    const monthMap = {};
    deals.forEach(d => {
      if (!d.inspection_date) return;
      const m = d.inspection_date.replace('検収','');
      if (!monthMap[m]) monthMap[m] = { actual:0, forecast:0 };
      if (ACT_STS.has(d.status))  monthMap[m].actual   += Number(d.amount)||0;
      if (FORE_STS.has(d.status)) monthMap[m].forecast += Number(d.amount)||0;
    });

    // by-customer
    const custMap = {};
    deals.filter(d => ACT_STS.has(d.status)).forEach(d => {
      const n = d.customer_name || '不明';
      custMap[n] = (custMap[n]||0) + (Number(d.amount)||0);
    });
    const byCustomer = Object.entries(custMap)
      .map(([customer, total]) => ({ customer, total }))
      .sort((a,b) => b.total - a.total);

    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
    const TOTAL = 6;

    // ----- PPT 生成 -----
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // ===== Slide 1: 表紙 =====
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

    // ===== Slide 2: 案件サマリー =====
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '案件サマリー', 2, TOTAL);

      const rate = totalTarget > 0 ? Math.round((totalAmount+totalForecast)/totalTarget*100) : 0;
      const rC = rate>=100 ? CLR.green : rate>=80 ? CLR.gold : CLR.red;

      const kpis = [
        { label:'案件数',     val:`${dealCount}件`,    sub:`完了 ${doneCount}件 / 見込 ${forecastCount}件`, color:CLR.accent },
        { label:'提案中案件', val:`${proposingCount}件`, sub:'proposing / planned',                         color:CLR.purple },
        { label:'売上目標',   val:fmtM(totalTarget),   sub:`¥${fmt(totalTarget)}`,                         color:CLR.textM },
        { label:'確定売上',   val:fmtM(totalAmount),   sub:`¥${fmt(totalAmount)}`,                         color:CLR.accent },
        { label:'着地予想',   val:fmtM(totalAmount+totalForecast), sub:`¥${fmt(totalAmount+totalForecast)}`, color:CLR.accent },
        { label:'目標達成率', val:`${rate}%`,           sub:rate>=100?'目標達成！':rate>=80?'あと少し':'要注意', color:rC },
      ];
      const BW=3.8, BH=2.35, GX=0.47, GY=0.42, SX=0.55, SY=1.0;
      kpis.forEach((k,i) => {
        const x = SX + (i%3)*(BW+GX);
        const y = SY + Math.floor(i/3)*(BH+GY);
        sl.addShape(pptx.ShapeType.rect, { x,y, w:BW, h:BH, fill:{color:CLR.white}, line:{color:CLR.accentL,width:1} });
        sl.addShape(pptx.ShapeType.rect, { x,y, w:BW, h:0.12, fill:{color:k.color} });
        sl.addText(k.label, { x:x+0.15, y:y+0.1,  w:BW-0.3, h:0.38, fontSize:10, color:CLR.textM });
        sl.addText(k.val,   { x:x+0.15, y:y+0.52, w:BW-0.3, h:1.08, fontSize:26, bold:true, color:k.color, align:'center' });
        sl.addText(k.sub,   { x:x+0.15, y:y+1.78, w:BW-0.3, h:0.42, fontSize:9,  color:CLR.textL, align:'center' });
      });
    }

    // ===== Slide 3: 月別売上実績 =====
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '月別売上実績', 3, TOTAL);

      let actTot=0, foreTot=0;
      const rows = [[hCell('月'), hCell('期'), hCell('実績','right'), hCell('見込','right'), hCell('合計','right')]];
      MONTH_ORDER.forEach((m,i) => {
        const d  = monthMap[m] || { actual:0, forecast:0 };
        const tot = d.actual + d.forecast;
        actTot += d.actual; foreTot += d.forecast;
        const bg = i%2===0 ? CLR.white : 'F2F7FC';
        rows.push([
          cell(m,                                          { fill:{color:bg}, align:'center', bold:true }),
          cell(UPPER_MONTHS.includes(m)?'上期':'下期',       { fill:{color:bg}, align:'center', color:CLR.textL, fontSize:9 }),
          cell(d.actual  >0?`¥${fmt(d.actual)}`  :'-',   { fill:{color:bg}, align:'right', color:d.actual  >0?CLR.accent :CLR.textL, bold:d.actual>0 }),
          cell(d.forecast>0?`¥${fmt(d.forecast)}`:'-',   { fill:{color:bg}, align:'right', color:d.forecast>0?CLR.orange:CLR.textL }),
          cell(tot       >0?`¥${fmt(tot)}`        :'-',  { fill:{color:bg}, align:'right', bold:tot>0 }),
        ]);
      });
      rows.push([
        cell('合計',              { fill:{color:CLR.rowAlt}, bold:true, align:'center' }),
        cell('',                  { fill:{color:CLR.rowAlt} }),
        cell(`¥${fmt(actTot)}`,  { fill:{color:CLR.rowAlt}, align:'right', bold:true, color:CLR.accent }),
        cell(`¥${fmt(foreTot)}`, { fill:{color:CLR.rowAlt}, align:'right', bold:true, color:CLR.orange }),
        cell(`¥${fmt(actTot+foreTot)}`, { fill:{color:CLR.rowAlt}, align:'right', bold:true }),
      ]);
      sl.addTable(rows, { x:1.5, y:1.0, w:10.3, colW:[1.3,1.1,2.9,2.5,2.5], rowH:0.4, border:{type:'solid',color:'C8D3E0',pt:0.5} });
    }

    // ===== Slide 4: 予実対比 =====
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '上期・下期・通期　予実対比', 4, TOTAL);

      const inM = (ds, months) => months.some(m => (ds||'').includes(m));
      const sumD = (sts, months) => deals.filter(d=>sts.has(d.status)&&inM(d.inspection_date,months)).reduce((s,d)=>s+(Number(d.amount)||0),0);
      const sumT = months => targetRows.filter(r=>months.includes(r.month)).reduce((s,r)=>s+(Number(r.amount)||0),0);

      const uB=sumT(UPPER_MONTHS), uA=sumD(ACT_STS,UPPER_MONTHS);
      const lB=sumT(LOWER_MONTHS), lA=sumD(ACT_STS,LOWER_MONTHS), lF=sumD(FORE_STS,LOWER_MONTHS);
      const periods = [
        { name:'上期', budget:uB,    actual:uA,    forecast:0  },
        { name:'下期', budget:lB,    actual:lA,    forecast:lF },
        { name:'通期', budget:uB+lB, actual:uA+lA, forecast:lF },
      ];

      const rows = [[hCell('期','center'),hCell('予算','right'),hCell('実績','right'),hCell('見込','right'),hCell('実績＋見込','right'),hCell('差異','right'),hCell('達成率','right')]];
      periods.forEach((p,i) => {
        const tot = p.actual+p.forecast;
        const diff= tot-p.budget;
        const rate= p.budget>0 ? Math.round(tot/p.budget*100) : 0;
        const bg  = i%2===0 ? CLR.white : 'F2F7FC';
        rows.push([
          cell(p.name,                               { fill:{color:bg},  align:'center', bold:true,  fontSize:13 }),
          cell(`¥${fmt(p.budget)}`,                  { fill:{color:bg},  align:'right',              fontSize:13, color:CLR.textM }),
          cell(`¥${fmt(p.actual)}`,                  { fill:{color:bg},  align:'right', bold:true,   fontSize:13, color:CLR.accent }),
          cell(p.forecast>0?`¥${fmt(p.forecast)}`:'-', { fill:{color:bg}, align:'right',             fontSize:13, color:CLR.orange }),
          cell(`¥${fmt(tot)}`,                       { fill:{color:bg},  align:'right', bold:true,   fontSize:13 }),
          cell(`${diff>=0?'+':''}¥${fmt(diff)}`,     { fill:{color:diff>=0?CLR.greenBg:CLR.redBg}, align:'right', bold:true, fontSize:13, color:diff>=0?CLR.green:CLR.red }),
          cell(`${rate}%`,                           { fill:{color:bg},  align:'right', bold:true,   fontSize:13, color:rate>=100?CLR.green:rate>=80?CLR.gold:CLR.red }),
        ]);
      });
      sl.addTable(rows, { x:0.5, y:1.4, w:12.3, colW:[1.3,2.2,2.1,1.9,2.2,1.8,1.3], rowH:1.0, border:{type:'solid',color:'C8D3E0',pt:0.5} });
      sl.addText('※ 見込：forecast / developing ステータスの案件合計', { x:0.5, y:4.75, w:12, h:0.3, fontSize:9, color:CLR.textL, italic:true });
    }

    // ===== Slide 5: 顧客別実績 =====
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '顧客別　取引実績', 5, TOTAL);

      const grandTot = byCustomer.reduce((s,d)=>s+d.total,0);
      const rows = [[hCell('順位','center'),hCell('顧客名','left'),hCell('取引金額','right'),hCell('構成比','right'),hCell('案件数','center')]];
      byCustomer.slice(0,10).forEach((d,i) => {
        const pct = grandTot>0 ? (d.total/grandTot*100).toFixed(1) : '0.0';
        const cnt = deals.filter(dl=>dl.customer_name===d.customer).length;
        const bg  = i%2===0 ? CLR.white : 'F2F7FC';
        rows.push([
          cell(`${i+1}`,          { fill:{color:bg}, align:'center', color:CLR.textM }),
          cell(d.customer||'',    { fill:{color:bg}, bold:i<3, color:CLR.textD }),
          cell(`¥${fmt(d.total)}`,{ fill:{color:bg}, align:'right', bold:true, color:CLR.accent }),
          cell(`${pct}%`,         { fill:{color:bg}, align:'right', color:CLR.textM }),
          cell(`${cnt}`,          { fill:{color:bg}, align:'center', color:CLR.textM }),
        ]);
      });
      rows.push([
        cell('合計',             { fill:{color:CLR.rowAlt}, align:'center', bold:true }),
        cell('',                 { fill:{color:CLR.rowAlt} }),
        cell(`¥${fmt(grandTot)}`,{ fill:{color:CLR.rowAlt}, align:'right', bold:true }),
        cell('100%',             { fill:{color:CLR.rowAlt}, align:'right', bold:true }),
        cell(`${deals.length}`,  { fill:{color:CLR.rowAlt}, align:'center', bold:true }),
      ]);
      sl.addTable(rows, { x:0.8, y:1.0, w:11.7, colW:[1.0,4.5,2.8,1.8,1.6], rowH:0.46, border:{type:'solid',color:'C8D3E0',pt:0.5} });
    }

    // ===== Slide 6: 案件一覧 =====
    {
      const sl = pptx.addSlide();
      sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{color:CLR.bg} });
      addFrame(pptx, sl, '案件一覧（進行中・見込）', 6, TOTAL);

      const ACTIVE = new Set(['won','developing','shikakake','forecast','monthly']);
      const active = deals.filter(d=>ACTIVE.has(d.status));
      const rows = [[hCell('顧客','left'),hCell('案件名','left'),hCell('ステータス','center'),hCell('金額','right'),hCell('検収月','center')]];
      const MAX = 15;
      active.slice(0,MAX).forEach((d,i) => {
        const bg = i%2===0 ? CLR.white : 'F2F7FC';
        rows.push([
          cell(d.customer_name||'',                           { fill:{color:bg}, bold:true, color:CLR.accent, fontSize:10 }),
          cell(d.title||'',                                   { fill:{color:bg}, color:CLR.textD, fontSize:10 }),
          cell(STATUS_LABELS[d.status]||d.status,             { fill:{color:bg}, align:'center', bold:true, color:STATUS_CLR[d.status]||CLR.textM, fontSize:10 }),
          cell(d.amount?`¥${fmt(d.amount)}`:'-',             { fill:{color:bg}, align:'right', color:CLR.textD, fontSize:10 }),
          cell((d.inspection_date||'').replace('検収','末')||'-', { fill:{color:bg}, align:'center', color:CLR.textM, fontSize:10 }),
        ]);
      });
      if (active.length > MAX) {
        rows.push([
          cell(`他 ${active.length-MAX} 件`, { fill:{color:CLR.rowAlt}, color:CLR.textL, italic:true, fontSize:10 }),
          cell('',{fill:{color:CLR.rowAlt}}), cell('',{fill:{color:CLR.rowAlt}}),
          cell('',{fill:{color:CLR.rowAlt}}), cell('',{fill:{color:CLR.rowAlt}}),
        ]);
      }
      sl.addTable(rows, { x:0.4, y:1.0, w:12.5, colW:[2.5,4.7,1.5,2.1,1.7], rowH:0.38, border:{type:'solid',color:'C8D3E0',pt:0.5} });
    }

    // ----- レスポンス返却 -----
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    const fn = `会議資料_${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fn)}`);
    res.send(buffer);

  } catch (err) {
    console.error('PPT生成エラー:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
