const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ========== Constants ==========
const MONTH_ORDER  = ['9月','10月','11月','12月','1月','2月','3月','4月','5月','6月','7月','8月'];
const UPPER_MONTHS = ['9月','10月','11月','12月','1月','2月'];
const LOWER_MONTHS = ['3月','4月','5月','6月','7月','8月'];
const ACT_STS  = new Set(['won','done','monthly','shikakake']);
const FORE_STS = new Set(['forecast','developing']);
const MAIN_IDS = new Set([5, 3]);
const SALES_ROWS = [{ id: 5, name: 'マイナビ' }, { id: 3, name: 'ケイ・コーポレーション' }, { id: 0, name: '開発案件' }];
const fmt     = v => Number(v||0).toLocaleString();
const toMonth = ds => (ds||'').replace('検収','').trim();
const inM     = (ds, m) => toMonth(ds) === m;

// ========== Theme Colors ==========
function getThemeColors(theme) {
  if (theme === 'excel') {
    return {
      bgMain:       '#f0f2f5',
      bgPanel:      '#ffffff',
      bgTh:         '#e8edf3',
      bgFooter:     '#f0f4f8',
      bgAccentCol:  '#dce6f1',
      bgInner:      '#f8f9fb',
      bgActionCard: '#f0f4f8',
      border:       '#c8d3e0',
      borderSubtle: '#e2e8f0',
      textHeading:  '#1a2332',
      textBody:     '#2d3748',
      textMuted:    '#4a5f82',
      textFaint:    '#64748b',
      textMid:      '#374151',
      accent:       '#2e75b6',
      colorActual:  '#16a34a',
      colorForecast:'#d97706',
      colorTarget:  '#2e75b6',
      colorGain:    '#16a34a',
      colorLoss:    '#dc2626',
      colorWarn:    '#b45309',
      gradFrom:     '#2e75b6',
      gradTo:       '#7e3af2',
      chartGrid:    '#e2e8f0',
      chartTick:    '#4a5568',
      chartLegend:  '#374151',
      chartActual:  '#2e75b6',
      chartForecast:'#ed7d31',
      chartTarget:  '#9dc3e6',
      pieColors:    ['#2e75b6','#7e3af2','#70ad47','#ed7d31','#c0392b','#4caf50','#2dd4bf','#fb923c','#a78bfa','#00b4d8','#ffc000','#e91e63'],
      statusColors: { done:'#16a34a', monthly:'#2e75b6', shikakake:'#d97706', won:'#2e75b6', developing:'#1d4ed8', forecast:'#d97706', proposing:'#7e22ce', planned:'#6b7280', open:'#6b7280' },
      scrollbarTrack: '#e8ecf0',
      scrollbarThumb: '#c8d3e0',
    };
  }
  if (theme === 'earth') {
    return {
      bgMain:       '#f2ede4',
      bgPanel:      '#faf6ef',
      bgTh:         '#ebe3d6',
      bgFooter:     '#ede8de',
      bgAccentCol:  '#d8ccb8',
      bgInner:      '#ede8de',
      bgActionCard: '#ede8de',
      border:       '#c4a882',
      borderSubtle: '#d8ccb8',
      textHeading:  '#2c1a0e',
      textBody:     '#4a3420',
      textMuted:    '#7a5c40',
      textFaint:    '#7a6252',
      textMid:      '#5a4535',
      accent:       '#b5651d',
      colorActual:  '#3a8040',
      colorForecast:'#c45510',
      colorTarget:  '#4a7a96',
      colorGain:    '#3a8040',
      colorLoss:    '#b03020',
      colorWarn:    '#b89010',
      gradFrom:     '#b5651d',
      gradTo:       '#966432',
      chartGrid:    '#d8ccb8',
      chartTick:    '#7a6252',
      chartLegend:  '#5a4535',
      chartActual:  '#a06820',
      chartForecast:'#c45510',
      chartTarget:  '#4a7a96',
      pieColors:    ['#a06820','#b5651d','#3a8040','#c45510','#4a7a96','#d4924a','#5a9060','#8b4513','#7a96b5','#c8a060','#b89010','#966432'],
      statusColors: { done:'#3a8040', monthly:'#4a7a96', shikakake:'#c45510', won:'#4a7a96', developing:'#2e5f7a', forecast:'#c45510', proposing:'#7a3a8a', planned:'#7a6252', open:'#7a6252' },
      scrollbarTrack: '#e8ddd0',
      scrollbarThumb: '#c4a882',
    };
  }
  // dark (default)
  return {
    bgMain:       '#0a0e1a',
    bgPanel:      '#0d1120',
    bgTh:         '#0a1628',
    bgFooter:     '#0a1628',
    bgAccentCol:  '#1a2540',
    bgInner:      '#0a0e1a',
    bgActionCard: '#0a1628',
    border:       '#1e2a45',
    borderSubtle: '#131825',
    textHeading:  '#e2e8f5',
    textBody:     '#c9d1e8',
    textMuted:    '#6b7fa3',
    textFaint:    '#64748b',
    textMid:      '#94a3b8',
    accent:       '#00d4ff',
    colorActual:  '#4ade80',
    colorForecast:'#f59e0b',
    colorTarget:  '#3b82f6',
    colorGain:    '#4ade80',
    colorLoss:    '#f87171',
    colorWarn:    '#facc15',
    gradFrom:     '#00d4ff',
    gradTo:       '#a78bfa',
    chartGrid:    '#131825',
    chartTick:    '#6b7fa3',
    chartLegend:  '#94a3b8',
    chartActual:  '#00d4ff',
    chartForecast:'#fb923c',
    chartTarget:  '#3b82f6',
    pieColors:    ['#00d4ff','#e879f9','#84cc16','#f59e0b','#f43f5e','#38bdf8','#34d399','#fb923c','#a78bfa','#2dd4bf','#facc15','#ec4899'],
    statusColors: { done:'#4ade80', monthly:'#00d4ff', shikakake:'#f59e0b', won:'#00d4ff', developing:'#3b82f6', forecast:'#f59e0b', proposing:'#a855f7', planned:'#6b7280', open:'#6b7280' },
    scrollbarTrack: '#0d1120',
    scrollbarThumb: '#1e2a45',
  };
}

const STATUS_LABELS = {
  done:'完了', monthly:'継続', shikakake:'仕掛中', won:'受注',
  developing:'開発中', forecast:'見込', proposing:'提案中',
  planned:'提案予定', open:'保留',
};
const STATUS_COLORS = {
  done:'#4ade80', monthly:'#00d4ff', shikakake:'#f59e0b', won:'#00d4ff',
  developing:'#3b82f6', forecast:'#f59e0b', proposing:'#a855f7',
  planned:'#6b7280', open:'#6b7280',
};

// ========== GET /export-html ==========
router.get('/', (req, res) => {
  try {
    const theme = req.query.theme || 'dark';
    const C = getThemeColors(theme);

    // ---- Data queries ----
    const deals = db.prepare(
      `SELECT d.*, c.company as customer_name FROM deals d LEFT JOIN customers c ON d.customer_id = c.id ORDER BY d.sort_order ASC`
    ).all();

    const targetRows = db.prepare('SELECT * FROM targets').all();
    const targetsMap = {};
    targetRows.forEach(r => { targetsMap[`${r.customer_id}_${r.month}`] = r.amount; });
    const getTarget = (cid, m) => targetsMap[`${cid}_${m}`] || 0;

    // ---- Computed totals ----
    const totalActual   = deals.filter(d => ACT_STS.has(d.status)).reduce((s,d) => s+(Number(d.amount)||0), 0);
    const totalForecast = deals.filter(d => FORE_STS.has(d.status)).reduce((s,d) => s+(Number(d.amount)||0), 0);
    const totalTarget   = targetRows.reduce((s,r) => s+(Number(r.amount)||0), 0);
    const achieveRate   = totalTarget > 0 ? Math.round((totalActual+totalForecast)/totalTarget*100) : 0;

    // ---- Period sums ----
    const uActual   = deals.filter(d => ACT_STS.has(d.status) && UPPER_MONTHS.some(m => inM(d.inspection_date,m))).reduce((s,d) => s+(Number(d.amount)||0), 0);
    const uTarget   = targetRows.filter(r => UPPER_MONTHS.includes(r.month)).reduce((s,r) => s+(Number(r.amount)||0), 0);
    const lActual   = deals.filter(d => ACT_STS.has(d.status) && LOWER_MONTHS.some(m => inM(d.inspection_date,m))).reduce((s,d) => s+(Number(d.amount)||0), 0);
    const lForecast = deals.filter(d => FORE_STS.has(d.status) && LOWER_MONTHS.some(m => inM(d.inspection_date,m))).reduce((s,d) => s+(Number(d.amount)||0), 0);
    const lTarget   = targetRows.filter(r => LOWER_MONTHS.includes(r.month)).reduce((s,r) => s+(Number(r.amount)||0), 0);
    const uDiff = uActual - uTarget;
    const uRate = uTarget > 0 ? Math.round(uActual/uTarget*100) : 0;
    const lDiff = (lActual+lForecast) - lTarget;

    // ---- Status counts ----
    const totalCount     = deals.length;
    const doneCount      = deals.filter(d => ['done','monthly'].includes(d.status)).length;
    const forecastCount  = deals.filter(d => ['forecast','developing'].includes(d.status)).length;
    const proposingCount = deals.filter(d => ['proposing','planned'].includes(d.status)).length;
    const shikakakeAmount = deals.filter(d => d.status==='shikakake').reduce((s,d) => s+(Number(d.amount)||0), 0);

    // ---- Monthly chart ----
    const monthActual   = MONTH_ORDER.map(m => deals.filter(d => ACT_STS.has(d.status) && inM(d.inspection_date,m)).reduce((s,d) => s+(Number(d.amount)||0), 0));
    const monthForecast = MONTH_ORDER.map(m => deals.filter(d => FORE_STS.has(d.status) && inM(d.inspection_date,m)).reduce((s,d) => s+(Number(d.amount)||0), 0));

    // ---- Customer breakdown ----
    const custMap = {};
    deals.filter(d => ACT_STS.has(d.status)).forEach(d => {
      const n = d.customer_name || '不明';
      custMap[n] = (custMap[n]||0) + (Number(d.amount)||0);
    });
    const allCustomers = Object.entries(custMap).map(([name,total]) => ({name,total})).sort((a,b) => b.total-a.total);
    const byCustomer = allCustomers;
    const otherTotal = byCustomer.slice(5).reduce((s,d) => s+d.total, 0);
    const byCustomerChart = [
      ...byCustomer.slice(0,5),
      ...(otherTotal > 0 ? [{name:'その他', total:otherTotal}] : [])
    ];

    // ---- 月別 予実比較データ ----
    const yojitsuData = MONTH_ORDER.map(m => {
      const actual   = deals.filter(d => ACT_STS.has(d.status)  && inM(d.inspection_date,m)).reduce((s,d)=>s+(Number(d.amount)||0),0);
      const forecast = deals.filter(d => FORE_STS.has(d.status) && inM(d.inspection_date,m)).reduce((s,d)=>s+(Number(d.amount)||0),0);
      const target   = targetRows.filter(r => r.month===m).reduce((s,r)=>s+(Number(r.amount)||0),0);
      return { month:m, target, bar2: actual>0?actual:forecast, bar3: actual>0?forecast:0, hasActual: actual>0 };
    }).filter(d => d.bar2>0 || d.target>0);

    // ---- 上期・下期・通期 予実対比データ ----
    const periodData = [
      { name:'上期', budget:uTarget, actual:uActual, forecast:0 },
      { name:'下期', budget:lTarget, actual:lActual, forecast:lForecast },
      { name:'通期', budget:uTarget+lTarget, actual:uActual+lActual, forecast:lForecast },
    ];

    // ---- Per-row actual/forecast for sales table ----
    const actualsMap = {}, forecastsMap = {};
    deals.forEach(d => {
      const month = toMonth(d.inspection_date);
      if (!month) return;
      const cid = MAIN_IDS.has(d.customer_id) ? d.customer_id : 0;
      if (ACT_STS.has(d.status)) {
        if (!actualsMap[cid]) actualsMap[cid] = {};
        actualsMap[cid][month] = (actualsMap[cid][month]||0) + (Number(d.amount)||0);
      }
      if (FORE_STS.has(d.status)) {
        if (!forecastsMap[cid]) forecastsMap[cid] = {};
        forecastsMap[cid][month] = (forecastsMap[cid][month]||0) + (Number(d.amount)||0);
      }
    });
    const getActual   = (cid,m) => actualsMap[cid]?.[m]||0;
    const getForecast = (cid,m) => forecastsMap[cid]?.[m]||0;

    // ---- Upper/Lower deals ----
    const upperDeals = deals
      .filter(d => ACT_STS.has(d.status) && d.inspection_date && UPPER_MONTHS.some(m => inM(d.inspection_date,m)))
      .sort((a,b) => {
        const ma = UPPER_MONTHS.findIndex(m => inM(a.inspection_date,m));
        const mb = UPPER_MONTHS.findIndex(m => inM(b.inspection_date,m));
        return ma !== mb ? ma-mb : (a.sort_order||0)-(b.sort_order||0);
      });
    const lowerDeals = deals
      .filter(d => (ACT_STS.has(d.status)||FORE_STS.has(d.status)) && d.inspection_date && LOWER_MONTHS.some(m => inM(d.inspection_date,m)))
      .sort((a,b) => {
        const ma = LOWER_MONTHS.findIndex(m => inM(a.inspection_date,m));
        const mb = LOWER_MONTHS.findIndex(m => inM(b.inspection_date,m));
        return ma !== mb ? ma-mb : (a.sort_order||0)-(b.sort_order||0);
      });

    // ---- Top deals ----
    const topDeals = [...deals]
      .filter(d => ACT_STS.has(d.status)||FORE_STS.has(d.status))
      .sort((a,b) => (Number(b.amount)||0)-(Number(a.amount)||0))
      .slice(0,10);

    // ---- Current / Previous month ----
    function getCurrentAndPrevMonth() {
      const now = new Date();
      const curM  = now.getMonth()+1;
      const prevM = curM === 1 ? 12 : curM-1;
      return { curLabel:`${curM}月`, prevLabel:`${prevM}月` };
    }
    const { curLabel, prevLabel } = getCurrentAndPrevMonth();
    const prevDeals = deals
      .filter(d => ACT_STS.has(d.status) && toMonth(d.inspection_date) === prevLabel)
      .sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
    const curDeals = deals
      .filter(d => (ACT_STS.has(d.status)||FORE_STS.has(d.status)) && toMonth(d.inspection_date) === curLabel)
      .sort((a,b) => {
        const ao = ACT_STS.has(a.status) ? 0 : 1;
        const bo = ACT_STS.has(b.status) ? 0 : 1;
        return ao !== bo ? ao-bo : (a.sort_order||0)-(b.sort_order||0);
      });

    // ---- Previous month budget ----
    const prevBudget  = targetRows.filter(r => r.month === prevLabel).reduce((s,r) => s+(Number(r.amount)||0), 0);
    const prevActual  = prevDeals.reduce((s,d) => s+(Number(d.amount)||0), 0);
    const prevDiff    = prevActual - prevBudget;

    // ---- Current month budget ----
    const curBudget   = targetRows.filter(r => r.month === curLabel).reduce((s,r) => s+(Number(r.amount)||0), 0);
    const curForecast = curDeals.filter(d => FORE_STS.has(d.status)).reduce((s,d) => s+(Number(d.amount)||0), 0);
    const curActual   = curDeals.filter(d => ACT_STS.has(d.status)).reduce((s,d) => s+(Number(d.amount)||0), 0);
    const curDiff     = (curActual + curForecast) - curBudget;

    // ---- Date for filename ----
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth()+1).padStart(2,'0');
    const day   = String(now.getDate()).padStart(2,'0');
    const dateStr = `${year}年${month}月${day}日`;

    // ---- Helper to build status badge ----
    function badge(status) {
      const label = STATUS_LABELS[status] || status;
      const color = C.statusColors[status] || '#6b7280';
      return `<span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;padding:2px 8px;font-size:11px;white-space:nowrap">${label}</span>`;
    }

    // ---- Helpers for sales table ----
    function salesTableRows() {
      const months = MONTH_ORDER;
      const upM    = UPPER_MONTHS;
      const loM    = LOWER_MONTHS;
      let html = '';

      // Per-row
      SALES_ROWS.forEach(row => {
        // Target row
        let trHtml = `<td style="padding:6px 8px;border:1px solid ${C.border};color:${C.accent};white-space:nowrap">${row.name}</td>`;
        trHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};color:${C.accent};font-size:11px">目標</td>`;
        upM.forEach(m => {
          const v = getTarget(row.id, m);
          trHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent}">${v ? fmt(v) : '-'}</td>`;
        });
        const uSum = upM.reduce((s,m) => s+getTarget(row.id,m), 0);
        trHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold">${fmt(uSum)}</td>`;
        loM.forEach(m => {
          const v = getTarget(row.id, m);
          trHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent}">${v ? fmt(v) : '-'}</td>`;
        });
        const lSum = loM.reduce((s,m) => s+getTarget(row.id,m), 0);
        trHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold">${fmt(lSum)}</td>`;
        trHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold;background:${C.bgAccentCol}">${fmt(uSum+lSum)}</td>`;
        html += `<tr>${trHtml}</tr>`;

        // Actual row
        let arHtml = `<td style="padding:6px 8px;border:1px solid ${C.border}"></td>`;
        arHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};color:${C.colorActual};font-size:11px">実績</td>`;
        upM.forEach(m => {
          const v = getActual(row.id, m);
          arHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual}">${v ? fmt(v) : '-'}</td>`;
        });
        const uaSum = upM.reduce((s,m) => s+getActual(row.id,m), 0);
        arHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold">${fmt(uaSum)}</td>`;
        loM.forEach(m => {
          const v = getActual(row.id, m);
          arHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual}">${v ? fmt(v) : '-'}</td>`;
        });
        const laSum = loM.reduce((s,m) => s+getActual(row.id,m), 0);
        arHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold">${fmt(laSum)}</td>`;
        arHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold;background:${C.bgAccentCol}">${fmt(uaSum+laSum)}</td>`;
        html += `<tr>${arHtml}</tr>`;

        // Forecast row
        let frHtml = `<td style="padding:6px 8px;border:1px solid ${C.border}"></td>`;
        frHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};color:${C.colorForecast};font-size:11px">見込</td>`;
        upM.forEach(m => {
          const v = getForecast(row.id, m);
          frHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast}">${v ? fmt(v) : '-'}</td>`;
        });
        const ufSum = upM.reduce((s,m) => s+getForecast(row.id,m), 0);
        frHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold">${fmt(ufSum)}</td>`;
        loM.forEach(m => {
          const v = getForecast(row.id, m);
          frHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast}">${v ? fmt(v) : '-'}</td>`;
        });
        const lfSum = loM.reduce((s,m) => s+getForecast(row.id,m), 0);
        frHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold">${fmt(lfSum)}</td>`;
        frHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold;background:${C.bgAccentCol}">${fmt(ufSum+lfSum)}</td>`;
        html += `<tr>${frHtml}</tr>`;
      });

      // Total target row
      let ttHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid ${C.border};color:${C.accent};font-weight:bold">合計（目標）</td>`;
      upM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        ttHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const uttSum = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      ttHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold">${fmt(uttSum)}</td>`;
      loM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        ttHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const lttSum = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      ttHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold">${fmt(lttSum)}</td>`;
      ttHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.accent};font-weight:bold;background:${C.bgAccentCol}">${fmt(uttSum+lttSum)}</td>`;
      html += `<tr style="border-top:2px solid ${C.border}">${ttHtml}</tr>`;

      // Total actual row
      let taHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid ${C.border};color:${C.colorActual};font-weight:bold">合計（実績）</td>`;
      upM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m), 0);
        taHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const utaSum = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m), 0), 0);
      taHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold">${fmt(utaSum)}</td>`;
      loM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m), 0);
        taHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const ltaSum = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m), 0), 0);
      taHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold">${fmt(ltaSum)}</td>`;
      taHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorActual};font-weight:bold;background:${C.bgAccentCol}">${fmt(utaSum+ltaSum)}</td>`;
      html += `<tr>${taHtml}</tr>`;

      // Total forecast row
      let tfHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid ${C.border};color:${C.colorForecast};font-weight:bold">合計（見込）</td>`;
      upM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getForecast(row.id,m), 0);
        tfHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const utfSum = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getForecast(row.id,m), 0), 0);
      tfHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold">${fmt(utfSum)}</td>`;
      loM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getForecast(row.id,m), 0);
        tfHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const ltfSum = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getForecast(row.id,m), 0), 0);
      tfHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold">${fmt(ltfSum)}</td>`;
      tfHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${C.colorForecast};font-weight:bold;background:${C.bgAccentCol}">${fmt(utfSum+ltfSum)}</td>`;
      html += `<tr>${tfHtml}</tr>`;

      // Variance row
      let dvHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid ${C.border};font-weight:bold">実績+見込 差異</td>`;
      upM.forEach(m => {
        const tgt = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        const act = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m)+getForecast(row.id,m), 0);
        const diff = act - tgt;
        const c = diff >= 0 ? C.colorGain : C.colorLoss;
        dvHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${c};font-weight:bold">${diff >= 0 ? '+' : ''}${fmt(diff)}</td>`;
      });
      const uTgtAll = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      const uActAll = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m)+getForecast(row.id,m), 0), 0);
      const uDiffAll = uActAll - uTgtAll;
      dvHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${uDiffAll>=0?C.colorGain:C.colorLoss};font-weight:bold">${uDiffAll>=0?'+':''}${fmt(uDiffAll)}</td>`;
      loM.forEach(m => {
        const tgt = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        const act = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m)+getForecast(row.id,m), 0);
        const diff = act - tgt;
        const c = diff >= 0 ? C.colorGain : C.colorLoss;
        dvHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${c};font-weight:bold">${diff >= 0 ? '+' : ''}${fmt(diff)}</td>`;
      });
      const lTgtAll = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      const lActAll = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m)+getForecast(row.id,m), 0), 0);
      const lDiffAll = lActAll - lTgtAll;
      dvHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${lDiffAll>=0?C.colorGain:C.colorLoss};font-weight:bold">${lDiffAll>=0?'+':''}${fmt(lDiffAll)}</td>`;
      const totalDiffAll = uDiffAll + lDiffAll;
      dvHtml += `<td style="padding:6px 8px;border:1px solid ${C.border};text-align:right;color:${totalDiffAll>=0?C.colorGain:C.colorLoss};font-weight:bold;background:${C.bgAccentCol}">${totalDiffAll>=0?'+':''}${fmt(totalDiffAll)}</td>`;
      html += `<tr style="border-top:2px solid ${C.border}">${dvHtml}</tr>`;

      return html;
    }

    function salesTableHeader() {
      let h = `<tr style="background:${C.bgTh};color:${C.textMid};font-size:12px">`;
      h += `<th style="padding:8px;border:1px solid ${C.border};text-align:left">顧客</th>`;
      h += `<th style="padding:8px;border:1px solid ${C.border};text-align:left">区分</th>`;
      UPPER_MONTHS.forEach(m => { h += `<th style="padding:8px;border:1px solid ${C.border};text-align:right">${m}</th>`; });
      h += `<th style="padding:8px;border:1px solid ${C.border};text-align:right;background:${C.bgAccentCol}">上期計</th>`;
      LOWER_MONTHS.forEach(m => { h += `<th style="padding:8px;border:1px solid ${C.border};text-align:right">${m}</th>`; });
      h += `<th style="padding:8px;border:1px solid ${C.border};text-align:right;background:${C.bgAccentCol}">下期計</th>`;
      h += `<th style="padding:8px;border:1px solid ${C.border};text-align:right;background:${C.bgAccentCol}">通期合計</th>`;
      h += `</tr>`;
      return h;
    }

    // ---- Embedded chart data ----
    const chartData = JSON.stringify({
      monthActual,
      monthForecast,
      byCustomerChart,
      achieveRate,
      doneCount,
      forecastCount,
      proposingCount,
      totalCount,
      yojitsuData,
      periodData,
      allCustomers,
      MONTH_ORDER,
    });

    // ---- HTML ----
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>25期 受託開発案件分析</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bgMain};color:${C.textHeading};font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;font-size:13px}
.slide{min-height:100vh;background:${C.bgMain};padding:40px 48px;page-break-after:always;display:flex;flex-direction:column}
.panel{background:${C.bgPanel};border:1px solid ${C.border};border-radius:10px;padding:24px}
.accent{color:${C.accent}}
h1{font-size:32px;font-weight:700;color:${C.textHeading}}
h2{font-size:20px;font-weight:700;color:${C.textHeading};margin-bottom:16px}
h3{font-size:15px;font-weight:600;color:${C.textMid};margin-bottom:12px}
.kpi-card{background:${C.bgPanel};border:1px solid ${C.border};border-radius:10px;padding:20px;flex:1}
.kpi-label{font-size:12px;color:${C.textFaint};margin-bottom:6px}
.kpi-value{font-size:26px;font-weight:700;color:${C.accent}}
.kpi-sub{font-size:11px;color:${C.textFaint};margin-top:4px}
table{width:100%;border-collapse:collapse}
th{background:${C.bgTh};color:${C.textMid};font-size:12px;padding:8px;border:1px solid ${C.border};text-align:left;font-weight:600}
td{padding:8px;border:1px solid ${C.border};color:${C.textHeading}}
tr:hover td{background:${C.bgPanel}}
.tag{display:inline-block;border-radius:4px;padding:2px 8px;font-size:11px}
@media print{.slide{page-break-after:always}}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:${C.scrollbarTrack}}
::-webkit-scrollbar-thumb{background:${C.scrollbarThumb};border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:${C.scrollbarThumb}}
*{scrollbar-width:thin;scrollbar-color:${C.scrollbarThumb} ${C.scrollbarTrack}}
</style>
</head>
<body>

<!-- Page 1: Cover -->
<div class="slide" style="justify-content:center;align-items:center;text-align:center;gap:32px">
  <div style="margin-bottom:8px">
    <div style="font-size:13px;color:${C.textFaint};letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">CONFIDENTIAL</div>
    <h1 style="font-size:42px;margin-bottom:8px">25期 受託開発案件分析</h1>
    <div style="font-size:22px;color:${C.accent};font-weight:300;letter-spacing:2px">月次報告資料</div>
  </div>
  <div style="display:flex;gap:24px;justify-content:center;margin:16px 0">
    <div class="panel" style="min-width:180px">
      <div style="font-size:11px;color:${C.textFaint};margin-bottom:4px">作成日</div>
      <div style="color:${C.textHeading};font-weight:600">${dateStr}</div>
    </div>

    <div class="panel" style="min-width:180px">
      <div style="font-size:11px;color:${C.textFaint};margin-bottom:4px">報告者</div>
      <div style="color:${C.textHeading};font-weight:600">SIユニット 生田目 貴史</div>
    </div>
  </div>
  <div class="panel" style="max-width:600px;width:100%;text-align:left">
    <div style="font-size:13px;color:${C.textMid};margin-bottom:12px;font-weight:600">アジェンダ</div>
    <ol style="list-style:decimal;padding-left:20px;line-height:2;color:${C.textBody}">
      <li>KPI概況と通期見通し</li>
      <li>月別売上推移と傾向</li>
      <li>上期・下期売上詳細</li>
      <li>今後のアクション</li>
    </ol>
  </div>
</div>

<!-- Page 2: KPI Dashboard (Dashboard style) -->
<div class="slide">
  <h2 style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;background:linear-gradient(90deg,${C.gradFrom},${C.gradTo});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">DASHBOARD</h2>

  <!-- 統計カード上段: 案件数/完了数/見込数/提案中 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
    ${[
      {label:'案件数',  value:totalCount,    color:C.accent},
      {label:'完了数',  value:doneCount,     color:C.accent},
      {label:'見込数',  value:forecastCount, color:C.accent},
      {label:'提案中',  value:proposingCount,color:C.accent},
    ].map(s => `<div class="panel" style="padding:14px 16px">
      <div style="font-size:12px;color:${C.textMuted};margin-bottom:6px">${s.label}</div>
      <div style="font-size:28px;font-weight:700;color:${s.color}">${s.value}</div>
    </div>`).join('')}
  </div>

  <!-- 統計カード下段: 売上目標/確定売上額/着地予想額 -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    ${[
      {label:'通期売上目標',   value:fmt(totalTarget),              color:C.accent},
      {label:'確定売上',       value:fmt(totalActual),              color:C.colorActual},
      {label:'着地予想額（円）', value:fmt(totalActual+totalForecast),color:C.colorForecast},
    ].map(s => `<div class="panel" style="padding:14px 16px">
      <div style="font-size:12px;color:${C.textMuted};margin-bottom:6px">${s.label}</div>
      <div style="font-size:24px;font-weight:700;color:${s.color}">${s.value}</div>
    </div>`).join('')}
  </div>

  <!-- 月別売上額 -->
  <div class="panel" style="margin-bottom:16px;padding:16px 20px">
    <h3 style="font-size:13px;font-weight:600;color:${C.textHeading};margin-bottom:12px">月別売上額</h3>
    <canvas id="monthlyStackedBar" height="80"></canvas>
  </div>

  <!-- 月別 予実比較 -->
  <div class="panel" style="padding:16px 20px">
    <h3 style="font-size:13px;font-weight:600;color:${C.textHeading};margin-bottom:12px">月別 予実比較</h3>
    <canvas id="yojitsuBar" height="80"></canvas>
  </div>
</div>

<!-- Page 3: Period Comparison + Customer -->
<div class="slide">
  <h2 style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;background:linear-gradient(90deg,${C.gradFrom},${C.gradTo});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">DASHBOARD</h2>

  <!-- 上期・下期・通期 予実対比 -->
  <div class="panel" style="margin-bottom:16px;padding:16px 20px">
    <h3 style="font-size:13px;font-weight:600;color:${C.textHeading};margin-bottom:12px">上期・下期・通期　予実対比</h3>
    <canvas id="periodBar" height="90"></canvas>
  </div>

  <!-- 上期/下期/通期 サマリーカード -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    ${periodData.map(p => {
      const actual = p.actual + p.forecast;
      const diff   = actual - p.budget;
      const rate   = p.budget > 0 ? Math.round(actual/p.budget*100) : 0;
      const dColor = diff > 0 ? C.colorGain : diff < 0 ? C.colorLoss : C.textMuted;
      const rColor = rate >= 100 ? C.colorGain : rate >= 80 ? C.colorWarn : C.colorLoss;
      return `<div class="panel" style="padding:14px 16px;font-size:12px">
        <div style="font-weight:700;font-size:13px;color:${C.textMuted};margin-bottom:10px">${p.name}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:${C.textMuted}">予算</span>
          <span style="color:${C.colorTarget};font-weight:600">¥${fmt(p.budget)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:${C.textMuted}">実績${p.forecast>0?'＋見込':''}</span>
          <span style="color:${C.accent};font-weight:600">¥${fmt(actual)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-top:1px solid ${C.border};padding-top:4px;margin-top:2px">
          <span style="color:${C.textMuted}">差異</span>
          <span style="color:${dColor};font-weight:700">${diff>0?'+':''}¥${fmt(diff)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:${C.textMuted}">達成率</span>
          <span style="color:${rColor};font-weight:700">${rate}%</span>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- 顧客別 取引実績 -->
  <div class="panel" style="padding:16px 20px">
    <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:16px">
      <h3 style="font-size:13px;font-weight:600;color:${C.textHeading}">顧客別 取引実績</h3>
      <span style="font-size:12px;color:${C.textMuted}">合計取引額：<span style="color:${C.accent};font-weight:700">¥${fmt(allCustomers.reduce((s,c)=>s+c.total,0))}</span></span>
    </div>
    <div style="display:flex;gap:24px;align-items:center">
      <div style="flex-shrink:0">
        <canvas id="custDonut" width="200" height="200"></canvas>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
        ${allCustomers.map((c,i) => {
          const col = C.pieColors[i % C.pieColors.length];
          return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
            <div style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0"></div>
            <span style="color:${C.textBody};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</span>
            <span style="color:${C.textHeading};font-weight:600;white-space:nowrap">¥${fmt(c.total)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
</div>

<!-- Page 5: Previous Month Sales -->
<div class="slide">
  <div style="margin-bottom:24px">
    <div style="font-size:11px;color:${C.textFaint};letter-spacing:3px;text-transform:uppercase">PREVIOUS MONTH</div>
    <h2 style="font-size:26px;margin-top:4px">${prevLabel}売上実績</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">${prevLabel}予算合計</div>
      <div class="kpi-value" style="color:${C.accent}">${fmt(prevBudget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${prevLabel}売上実績合計</div>
      <div class="kpi-value" style="color:${C.colorActual}">${fmt(prevActual)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${prevLabel}差異</div>
      <div class="kpi-value" style="color:${prevDiff>=0?C.colorGain:C.colorLoss}">${prevDiff>=0?'+':''}${fmt(prevDiff)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">案件</div>
      <div class="kpi-value">${prevDeals.length}</div>
      <div class="kpi-sub">件</div>
    </div>
  </div>
  <div class="panel" style="flex:1">
    <table>
      <thead>
        <tr><th>顧客名</th><th>案件名</th><th style="text-align:right">金額</th><th>検収月</th><th>ステータス</th></tr>
      </thead>
      <tbody>
        ${prevDeals.map(d => `<tr>
          <td style="color:${C.textMid};font-size:12px">${d.customer_name||'-'}</td>
          <td>${d.title||'-'}</td>
          <td style="text-align:right;color:${C.colorActual};font-weight:600">${fmt(d.amount)}</td>
          <td style="color:${C.textMid};font-size:12px">${d.inspection_date||'-'}</td>
          <td>${badge(d.status)}</td>
        </tr>`).join('')}
        ${prevDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:${C.textFaint};padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${C.textHeading}">合計</td>
          <td style="text-align:right;color:${C.colorActual};font-weight:700">${fmt(prevDeals.reduce((s,d)=>s+(Number(d.amount)||0),0))}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 6: Current Month Forecast -->
<div class="slide">
  <div style="margin-bottom:24px">
    <div style="font-size:11px;color:${C.textFaint};letter-spacing:3px;text-transform:uppercase">CURRENT MONTH</div>
    <h2 style="font-size:26px;margin-top:4px">${curLabel}売上予測</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">${curLabel}予算合計</div>
      <div class="kpi-value" style="color:${C.accent}">${fmt(curBudget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${curLabel}売上見込合計</div>
      <div class="kpi-value" style="color:${C.colorForecast}">${fmt(curForecast)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${curLabel}差異</div>
      <div class="kpi-value" style="color:${curDiff>=0?C.colorGain:C.colorLoss}">${curDiff>=0?'+':''}${fmt(curDiff)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">件数</div>
      <div class="kpi-value">${curDeals.length}</div>
      <div class="kpi-sub">件</div>
    </div>
  </div>
  <div class="panel" style="flex:1">
    <div style="font-size:11px;color:${C.colorForecast};margin-bottom:8px">※ オレンジ色は見込案件</div>
    <table>
      <thead>
        <tr><th>顧客名</th><th>案件名</th><th style="text-align:right">金額</th><th>検収月</th><th>ステータス</th></tr>
      </thead>
      <tbody>
        ${curDeals.map(d => {
          const isFore = FORE_STS.has(d.status);
          return `<tr>
            <td style="color:${C.textMid};font-size:12px">${d.customer_name||'-'}</td>
            <td style="color:${isFore?C.colorForecast:C.textHeading}">${d.title||'-'}</td>
            <td style="text-align:right;color:${isFore?C.colorForecast:C.colorActual};font-weight:600">${fmt(d.amount)}</td>
            <td style="color:${C.textMid};font-size:12px">${d.inspection_date||'-'}</td>
            <td>${badge(d.status)}</td>
          </tr>`;
        }).join('')}
        ${curDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:${C.textFaint};padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${C.textHeading}">合計</td>
          <td style="text-align:right;color:${C.accent};font-weight:700">${fmt(curDeals.reduce((s,d)=>s+(Number(d.amount)||0),0))}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 7: Sales Management Table -->
<div class="slide">
  <div style="margin-bottom:20px">
    <div style="font-size:11px;color:${C.textFaint};letter-spacing:3px;text-transform:uppercase">BUDGET VS ACTUAL</div>
    <h2 style="font-size:26px;margin-top:4px">売上管理表（予実対比）</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">通期予算</div>
      <div class="kpi-value" style="color:${C.accent}">${fmt(totalTarget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">受注額確定</div>
      <div class="kpi-value" style="color:${C.colorActual}">${fmt(totalActual)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">通期見通し</div>
      <div class="kpi-value" style="color:${C.colorForecast}">${fmt(totalActual+totalForecast)}</div>
      <div class="kpi-sub">
        <span style="background:${(totalActual+totalForecast-totalTarget)>=0?C.colorGain+'33':C.colorLoss+'33'};color:${(totalActual+totalForecast-totalTarget)>=0?C.colorGain:C.colorLoss};border-radius:4px;padding:2px 6px;font-size:11px">
          ${(totalActual+totalForecast-totalTarget)>=0?'+':'▲'} ${fmt(Math.abs(totalActual+totalForecast-totalTarget))}
        </span>
      </div>
    </div>
  </div>
  <div class="panel" style="flex:1;overflow-x:auto">
    <table style="min-width:900px">
      <thead>${salesTableHeader()}</thead>
      <tbody>${salesTableRows()}</tbody>
    </table>
  </div>
</div>

<!-- Page 8: Upper Half Sales -->
<div class="slide">
  <div style="margin-bottom:20px">
    <div style="font-size:11px;color:${C.textFaint};letter-spacing:3px;text-transform:uppercase">UPPER HALF</div>
    <h2 style="font-size:26px;margin-top:4px">上期 売上一覧（9月〜2月）</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">上期予算</div>
      <div class="kpi-value" style="color:${C.accent}">${fmt(uTarget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">上期実績合計</div>
      <div class="kpi-value" style="color:${C.colorActual}">${fmt(uActual)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">予算比差異</div>
      <div class="kpi-value" style="color:${uDiff>=0?C.colorGain:C.colorLoss}">${uDiff>=0?'+':''}${fmt(uDiff)}</div>
      <div class="kpi-sub">達成率: ${uRate}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">仕掛品計上額</div>
      <div class="kpi-value" style="color:${C.colorForecast}">${fmt(shikakakeAmount)}</div>
      <div class="kpi-sub">円</div>
    </div>
  </div>
  <div class="panel" style="flex:1">
    <table>
      <thead>
        <tr><th>顧客名</th><th>プロジェクト名</th><th style="text-align:right">金額</th><th>検収</th><th>備考</th></tr>
      </thead>
      <tbody>
        ${upperDeals.map(d => `<tr>
          <td style="color:${C.textMid};font-size:12px">${d.customer_name||'-'}</td>
          <td>${d.title||'-'}</td>
          <td style="text-align:right;color:${C.colorActual};font-weight:600">${fmt(d.amount)}</td>
          <td style="color:${C.textMid};font-size:12px">${d.inspection_date||'-'}</td>
          <td>${d.status==='shikakake'?`<span class="tag" style="background:${C.colorForecast}22;color:${C.colorForecast};border:1px solid ${C.colorForecast}44">仕掛かり計上</span>`:''}${d.is_new?`<span class="tag" style="background:${C.accent}22;color:${C.accent};border:1px solid ${C.accent}44;margin-left:4px">NEW</span>`:''}</td>
        </tr>`).join('')}
        ${upperDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:${C.textFaint};padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${C.textHeading}">上期売上合計</td>
          <td style="text-align:right;color:${C.colorActual};font-weight:700">${fmt(uActual)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${C.accent}">上期予算</td>
          <td style="text-align:right;color:${C.accent};font-weight:700">${fmt(uTarget)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${uDiff>=0?C.colorGain:C.colorLoss}">差異</td>
          <td style="text-align:right;color:${uDiff>=0?C.colorGain:C.colorLoss};font-weight:700">${uDiff>=0?'+':''}${fmt(uDiff)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 9: Lower Half Sales -->
<div class="slide">
  <div style="margin-bottom:20px">
    <div style="font-size:11px;color:${C.textFaint};letter-spacing:3px;text-transform:uppercase">LOWER HALF</div>
    <h2 style="font-size:26px;margin-top:4px">下期 売上一覧（3月〜8月）</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">下期予算</div>
      <div class="kpi-value" style="color:${C.accent}">${fmt(lTarget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">下期合計（実績＋見込）</div>
      <div class="kpi-value" style="color:${C.colorForecast}">${fmt(lActual+lForecast)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">予算比差異</div>
      <div class="kpi-value" style="color:${lDiff>=0?C.colorGain:C.colorLoss}">${lDiff>=0?'+':''}${fmt(lDiff)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">見込案件合計</div>
      <div class="kpi-value" style="color:${C.colorForecast}">${fmt(lForecast)}</div>
      <div class="kpi-sub">円</div>
    </div>
  </div>
  ${lDiff < 0 ? `<div style="background:${C.colorLoss}22;border:1px solid ${C.colorLoss};border-radius:8px;padding:12px 16px;margin-bottom:16px;color:${C.colorLoss};font-size:13px">
    ⚠ 下期予算に対し <strong>${fmt(Math.abs(lDiff))}円</strong> の未達見込みがあります。追加案件の発掘・早期受注が必要です。
  </div>` : ''}
  <div class="panel" style="flex:1">
    <table>
      <thead>
        <tr><th>顧客名</th><th>プロジェクト名</th><th style="text-align:right">金額</th><th>検収</th><th>備考</th></tr>
      </thead>
      <tbody>
        ${lowerDeals.map(d => {
          const isFore = FORE_STS.has(d.status);
          return `<tr>
            <td style="color:${C.textMid};font-size:12px">${d.customer_name||'-'}</td>
            <td style="color:${isFore?C.colorForecast:C.textHeading}">${d.title||'-'}</td>
            <td style="text-align:right;color:${isFore?C.colorForecast:C.colorActual};font-weight:600">${fmt(d.amount)}</td>
            <td style="color:${C.textMid};font-size:12px">${d.inspection_date||'-'}</td>
            <td>
              ${isFore?`<span class="tag" style="background:${C.colorForecast}22;color:${C.colorForecast};border:1px solid ${C.colorForecast}44">見込</span>`:''}
              ${d.status==='shikakake'?`<span class="tag" style="background:${C.colorForecast}22;color:${C.colorForecast};border:1px solid ${C.colorForecast}44;margin-left:4px">仕掛かり計上</span>`:''}
              ${d.is_new?`<span class="tag" style="background:${C.accent}22;color:${C.accent};border:1px solid ${C.accent}44;margin-left:4px">NEW</span>`:''}
            </td>
          </tr>`;
        }).join('')}
        ${lowerDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:${C.textFaint};padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${C.colorForecast}">下期売上合計（実績＋見込）</td>
          <td style="text-align:right;color:${C.colorForecast};font-weight:700">${fmt(lActual+lForecast)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${C.accent}">下期予算</td>
          <td style="text-align:right;color:${C.accent};font-weight:700">${fmt(lTarget)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:${C.bgFooter}">
          <td colspan="2" style="font-weight:700;color:${lDiff>=0?C.colorGain:C.colorLoss}">差異</td>
          <td style="text-align:right;color:${lDiff>=0?C.colorGain:C.colorLoss};font-weight:700">${lDiff>=0?'+':''}${fmt(lDiff)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 10: Summary & Actions -->
<div class="slide">
  <div style="margin-bottom:24px">
    <div style="font-size:11px;color:${C.textFaint};letter-spacing:3px;text-transform:uppercase">SUMMARY & ACTIONS</div>
    <h2 style="font-size:26px;margin-top:4px">まとめ・今後のアクション</h2>
  </div>
  <div style="display:flex;gap:16px;flex:1">
    <div class="panel" style="flex:1">
      <h3>全体所感・分析</h3>
      <div style="line-height:2;color:${C.textMid};font-size:13px">
        <p style="margin-bottom:12px">予想達成率は <strong style="color:${achieveRate>=100?C.colorGain:achieveRate>=80?C.colorWarn:C.colorLoss};font-size:16px">${achieveRate}%</strong> です。</p>
        <p style="margin-bottom:14px;line-height:1.9;color:${C.textBody}">
          上期は新規・既存案件ともに順調に売上を積み上げ、予算を大幅にリードする結果となった。
          下期は案件の端境期に伴い一時的に売上がへこむ局面となるが、
          岩倉建設・セルコホームをはじめとする既受注案件の検収が予定通りに進めば、
          通期で予算を <strong style="color:${C.colorGain}">約950万円上回るプラス着地</strong> が見込まれる。
          引き続き下期案件の進捗管理と新規提案活動を両輪で推進し、着実な予算超過達成を目指す。
        </p>
        <ul style="list-style:disc;padding-left:20px;line-height:2.2">
          <li>確定売上: <strong style="color:${C.colorActual}">${fmt(totalActual)}</strong> 円</li>
          <li>見込売上: <strong style="color:${C.colorForecast}">${fmt(totalForecast)}</strong> 円</li>
          <li>通期予算: <strong style="color:${C.accent}">${fmt(totalTarget)}</strong> 円</li>
          <li>上期達成率: <strong style="color:${uRate>=100?C.colorGain:uRate>=80?C.colorWarn:C.colorLoss}">${uRate}%</strong></li>
        </ul>
      </div>
    </div>
    <div class="panel" style="flex:1">
      <h3>重点リスク・課題</h3>
      <div style="line-height:2">
        <div style="background:${C.colorLoss}22;border-left:3px solid ${C.colorLoss};padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:10px;font-size:13px;color:${C.colorLoss}">
          <strong>【最重要】</strong> 岩倉建設・セルコホームの納品完遂が通期目標達成の最重要課題
        </div>
        <ul style="list-style:disc;padding-left:20px;color:${C.textMid};font-size:13px;line-height:2.2">
          <li>岩倉建設：営業管理システム開発の納品・検収完了を最優先で推進</li>
          <li>セルコホーム：顧客管理システムの要件確定・納品スケジュール厳守</li>
          <li>見込案件の確度管理と早期受注化</li>
          <li>下期案件の提案活動強化（${fmt(lTarget-lActual-lForecast)}円の積み上げが必要）</li>
        </ul>
      </div>
    </div>
    <div class="panel" style="flex:1">
      <h3>アクションプラン</h3>
      <div style="display:grid;gap:10px">
        <div style="background:${C.bgActionCard};border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:${C.colorTarget}22;color:${C.colorTarget};border:1px solid ${C.colorTarget}44;border-radius:4px;padding:2px 8px;font-size:11px">今月</span>
            <span style="font-weight:600;font-size:13px">見込案件のクロージング</span>
          </div>
          <p style="color:${C.textFaint};font-size:12px">見込ステータス案件の提案完了・受注確定を推進</p>
        </div>
        <div style="background:${C.bgActionCard};border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:${C.colorForecast}22;color:${C.colorForecast};border:1px solid ${C.colorForecast}44;border-radius:4px;padding:2px 8px;font-size:11px">今四半期</span>
            <span style="font-weight:600;font-size:13px">下期パイプラインの構築</span>
          </div>
          <p style="color:${C.textFaint};font-size:12px">下期目標達成に向けた新規商談の創出</p>
        </div>
        <div style="background:${C.bgActionCard};border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:${C.statusColors.proposing}22;color:${C.statusColors.proposing};border:1px solid ${C.statusColors.proposing}44;border-radius:4px;padding:2px 8px;font-size:11px">継続</span>
            <span style="font-weight:600;font-size:13px">既存顧客の深耕・拡大</span>
          </div>
          <p style="color:${C.textFaint};font-size:12px">主要顧客への追加提案・新規ニーズ発掘</p>
        </div>
        <div style="background:${C.bgActionCard};border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:${C.colorActual}22;color:${C.colorActual};border:1px solid ${C.colorActual}44;border-radius:4px;padding:2px 8px;font-size:11px">随時</span>
            <span style="font-weight:600;font-size:13px">案件情報の精度向上</span>
          </div>
          <p style="color:${C.textFaint};font-size:12px">CRMデータの定期更新・ステータス管理の徹底</p>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var DATA = ${chartData};

  var MONTH_ORDER = ['9月','10月','11月','12月','1月','2月','3月','4月','5月','6月','7月','8月'];
  var UPPER_IDX = 6;

  // Gauge Chart (Page 2)
  var gaugeCtx = document.getElementById('gaugeChart');
  if (gaugeCtx) {
    var rate = DATA.achieveRate;
    var clampedRate = Math.min(rate, 100);
    var gaugeColor = rate >= 100 ? '${C.colorGain}' : rate >= 80 ? '${C.colorWarn}' : '${C.colorLoss}';
    new Chart(gaugeCtx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [clampedRate, 100 - clampedRate],
          backgroundColor: [gaugeColor, '${C.border}'],
          borderWidth: 0,
          circumference: 180,
          rotation: -90
        }]
      },
      options: {
        responsive: false,
        cutout: '75%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  }

  // Monthly Stacked Bar (Page 2) - 実績/見込 積み上げ
  var monthlyStackedCtx = document.getElementById('monthlyStackedBar');
  if (monthlyStackedCtx) {
    new Chart(monthlyStackedCtx, {
      type: 'bar',
      data: {
        labels: DATA.MONTH_ORDER,
        datasets: [
          { label: '実績', data: DATA.monthActual,   backgroundColor: '${C.chartActual}', borderRadius: 2, stack: 'a' },
          { label: '見込', data: DATA.monthForecast, backgroundColor: '${C.chartForecast}', borderRadius: 2, stack: 'a' }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true, ticks: { color: '${C.chartTick}', font: { size: 11 } }, grid: { color: '${C.borderSubtle}' } },
          y: { stacked: true, ticks: { color: '${C.chartTick}', font: { size: 11 }, callback: function(v) { return '¥' + (v/10000).toFixed(0) + '万'; } }, grid: { color: '${C.borderSubtle}' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '${C.chartLegend}', font: { size: 11 }, boxWidth: 14, padding: 12 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label + '：¥' + Number(ctx.raw||0).toLocaleString(); } } }
        }
      }
    });
  }

  // 月別 予実比較 Bar (Page 2)
  var yojitsuCtx = document.getElementById('yojitsuBar');
  if (yojitsuCtx) {
    var yLabels  = DATA.yojitsuData.map(function(d) { return d.month; });
    var yTarget  = DATA.yojitsuData.map(function(d) { return d.target; });
    var yBar2    = DATA.yojitsuData.map(function(d) { return d.bar2; });
    var yBar3    = DATA.yojitsuData.map(function(d) { return d.bar3; });
    var yBar2Colors = DATA.yojitsuData.map(function(d) { return d.hasActual ? '${C.chartActual}' : '${C.chartForecast}'; });
    new Chart(yojitsuCtx, {
      type: 'bar',
      data: {
        labels: yLabels,
        datasets: [
          { label: '目標', data: yTarget, backgroundColor: '${C.colorTarget}', borderRadius: 2 },
          { label: '実績', data: yBar2,   backgroundColor: yBar2Colors, borderRadius: 2 },
          { label: '見込', data: yBar3,   backgroundColor: '${C.chartForecast}', borderRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: '${C.chartTick}', font: { size: 11 } }, grid: { color: '${C.borderSubtle}' } },
          y: { ticks: { color: '${C.chartTick}', font: { size: 11 }, callback: function(v) { return '¥' + (v/10000).toFixed(0) + '万'; } }, grid: { color: '${C.borderSubtle}' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '${C.chartLegend}', font: { size: 11 }, boxWidth: 14, padding: 12 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label + '：¥' + Number(ctx.raw||0).toLocaleString(); } } }
        }
      }
    });
  }

  // 上期・下期・通期 予実対比 Bar (Page 3)
  var periodCtx = document.getElementById('periodBar');
  if (periodCtx) {
    new Chart(periodCtx, {
      type: 'bar',
      data: {
        labels: DATA.periodData.map(function(p) { return p.name; }),
        datasets: [
          { label: '予算', data: DATA.periodData.map(function(p) { return p.budget; }),           backgroundColor: '${C.colorTarget}', borderRadius: 4 },
          { label: '実績', data: DATA.periodData.map(function(p) { return p.actual; }),           backgroundColor: '${C.chartActual}', borderRadius: 4 },
          { label: '見込', data: DATA.periodData.map(function(p) { return p.forecast; }),         backgroundColor: '${C.chartForecast}', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: '${C.textBody}', font: { size: 13, weight: '600' } }, grid: { display: false } },
          y: { ticks: { color: '${C.chartTick}', font: { size: 11 }, callback: function(v) { return (v/10000).toFixed(0) + '万'; } }, grid: { color: '${C.borderSubtle}' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '${C.chartLegend}', font: { size: 11 }, boxWidth: 14, padding: 12 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label + '：¥' + Number(ctx.raw||0).toLocaleString(); } } }
        }
      }
    });
  }

  // Customer Donut (Page 3)
  var custDonutCtx = document.getElementById('custDonut');
  if (custDonutCtx) {
    var PIE_COLORS = ${JSON.stringify(C.pieColors)};
    new Chart(custDonutCtx, {
      type: 'doughnut',
      data: {
        labels: DATA.allCustomers.map(function(c) { return c.name; }),
        datasets: [{
          data: DATA.allCustomers.map(function(c) { return c.total; }),
          backgroundColor: DATA.allCustomers.map(function(c,i) { return PIE_COLORS[i % PIE_COLORS.length]; }),
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        cutout: '55%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.label + '：¥' + Number(ctx.raw||0).toLocaleString(); } } }
        }
      }
    });
  }

  // Status Donut 2 (Page 4)
  var statusDonut2Ctx = document.getElementById('statusDonut2');
  if (statusDonut2Ctx) {
    new Chart(statusDonut2Ctx, {
      type: 'doughnut',
      data: {
        labels: ['完了', '見込・開発中', '提案中・予定', 'その他'],
        datasets: [{
          data: [
            DATA.doneCount,
            DATA.forecastCount,
            DATA.proposingCount,
            Math.max(0, DATA.totalCount - DATA.doneCount - DATA.forecastCount - DATA.proposingCount)
          ],
          backgroundColor: ['${C.colorActual}', '${C.colorForecast}', '${C.statusColors.proposing}', '#6b7280'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '${C.chartLegend}', font: { size: 10 }, boxWidth: 10 } }
        }
      }
    });
  }
})();
<\/script>
</body>
</html>`;

    const fn = `会議資料_${year}-${month}-${day}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report.html"; filename*=UTF-8''${encodeURIComponent(fn)}`);
    res.send(html);

  } catch (err) {
    console.error('exportHTML error:', err);
    res.status(500).send('レポート生成エラー: ' + err.message);
  }
});

module.exports = router;
