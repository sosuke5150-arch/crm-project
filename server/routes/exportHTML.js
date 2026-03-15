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
      const color = STATUS_COLORS[status] || '#6b7280';
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
        let trHtml = `<td style="padding:6px 8px;border:1px solid #1e2a45;color:#00d4ff;white-space:nowrap">${row.name}</td>`;
        trHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;color:#00d4ff;font-size:11px">目標</td>`;
        upM.forEach(m => {
          const v = getTarget(row.id, m);
          trHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff">${v ? fmt(v) : '-'}</td>`;
        });
        const uSum = upM.reduce((s,m) => s+getTarget(row.id,m), 0);
        trHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold">${fmt(uSum)}</td>`;
        loM.forEach(m => {
          const v = getTarget(row.id, m);
          trHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff">${v ? fmt(v) : '-'}</td>`;
        });
        const lSum = loM.reduce((s,m) => s+getTarget(row.id,m), 0);
        trHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold">${fmt(lSum)}</td>`;
        trHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold;background:#0f1f38">${fmt(uSum+lSum)}</td>`;
        html += `<tr>${trHtml}</tr>`;

        // Actual row
        let arHtml = `<td style="padding:6px 8px;border:1px solid #1e2a45"></td>`;
        arHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;color:#4ade80;font-size:11px">実績</td>`;
        upM.forEach(m => {
          const v = getActual(row.id, m);
          arHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80">${v ? fmt(v) : '-'}</td>`;
        });
        const uaSum = upM.reduce((s,m) => s+getActual(row.id,m), 0);
        arHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold">${fmt(uaSum)}</td>`;
        loM.forEach(m => {
          const v = getActual(row.id, m);
          arHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80">${v ? fmt(v) : '-'}</td>`;
        });
        const laSum = loM.reduce((s,m) => s+getActual(row.id,m), 0);
        arHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold">${fmt(laSum)}</td>`;
        arHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold;background:#0f1f38">${fmt(uaSum+laSum)}</td>`;
        html += `<tr>${arHtml}</tr>`;

        // Forecast row
        let frHtml = `<td style="padding:6px 8px;border:1px solid #1e2a45"></td>`;
        frHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;color:#f59e0b;font-size:11px">見込</td>`;
        upM.forEach(m => {
          const v = getForecast(row.id, m);
          frHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b">${v ? fmt(v) : '-'}</td>`;
        });
        const ufSum = upM.reduce((s,m) => s+getForecast(row.id,m), 0);
        frHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold">${fmt(ufSum)}</td>`;
        loM.forEach(m => {
          const v = getForecast(row.id, m);
          frHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b">${v ? fmt(v) : '-'}</td>`;
        });
        const lfSum = loM.reduce((s,m) => s+getForecast(row.id,m), 0);
        frHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold">${fmt(lfSum)}</td>`;
        frHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold;background:#0f1f38">${fmt(ufSum+lfSum)}</td>`;
        html += `<tr>${frHtml}</tr>`;
      });

      // Total target row
      let ttHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid #1e2a45;color:#00d4ff;font-weight:bold">合計（目標）</td>`;
      upM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        ttHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const uttSum = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      ttHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold">${fmt(uttSum)}</td>`;
      loM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        ttHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const lttSum = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      ttHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold">${fmt(lttSum)}</td>`;
      ttHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#00d4ff;font-weight:bold;background:#0f1f38">${fmt(uttSum+lttSum)}</td>`;
      html += `<tr style="border-top:2px solid #1e2a45">${ttHtml}</tr>`;

      // Total actual row
      let taHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid #1e2a45;color:#4ade80;font-weight:bold">合計（実績）</td>`;
      upM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m), 0);
        taHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const utaSum = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m), 0), 0);
      taHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold">${fmt(utaSum)}</td>`;
      loM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m), 0);
        taHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const ltaSum = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m), 0), 0);
      taHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold">${fmt(ltaSum)}</td>`;
      taHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#4ade80;font-weight:bold;background:#0f1f38">${fmt(utaSum+ltaSum)}</td>`;
      html += `<tr>${taHtml}</tr>`;

      // Total forecast row
      let tfHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid #1e2a45;color:#f59e0b;font-weight:bold">合計（見込）</td>`;
      upM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getForecast(row.id,m), 0);
        tfHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const utfSum = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getForecast(row.id,m), 0), 0);
      tfHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold">${fmt(utfSum)}</td>`;
      loM.forEach(m => {
        const v = SALES_ROWS.reduce((s,row) => s+getForecast(row.id,m), 0);
        tfHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold">${v ? fmt(v) : '-'}</td>`;
      });
      const ltfSum = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getForecast(row.id,m), 0), 0);
      tfHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold">${fmt(ltfSum)}</td>`;
      tfHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:#f59e0b;font-weight:bold;background:#0f1f38">${fmt(utfSum+ltfSum)}</td>`;
      html += `<tr>${tfHtml}</tr>`;

      // Variance row
      let dvHtml = `<td colspan="2" style="padding:6px 8px;border:1px solid #1e2a45;font-weight:bold">実績+見込 差異</td>`;
      upM.forEach(m => {
        const tgt = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        const act = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m)+getForecast(row.id,m), 0);
        const diff = act - tgt;
        const c = diff >= 0 ? '#4ade80' : '#f87171';
        dvHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:${c};font-weight:bold">${diff >= 0 ? '+' : ''}${fmt(diff)}</td>`;
      });
      const uTgtAll = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      const uActAll = upM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m)+getForecast(row.id,m), 0), 0);
      const uDiffAll = uActAll - uTgtAll;
      dvHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:${uDiffAll>=0?'#4ade80':'#f87171'};font-weight:bold">${uDiffAll>=0?'+':''}${fmt(uDiffAll)}</td>`;
      loM.forEach(m => {
        const tgt = SALES_ROWS.reduce((s,row) => s+getTarget(row.id,m), 0);
        const act = SALES_ROWS.reduce((s,row) => s+getActual(row.id,m)+getForecast(row.id,m), 0);
        const diff = act - tgt;
        const c = diff >= 0 ? '#4ade80' : '#f87171';
        dvHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:${c};font-weight:bold">${diff >= 0 ? '+' : ''}${fmt(diff)}</td>`;
      });
      const lTgtAll = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getTarget(row.id,m), 0), 0);
      const lActAll = loM.reduce((s,m) => s+SALES_ROWS.reduce((ss,row) => ss+getActual(row.id,m)+getForecast(row.id,m), 0), 0);
      const lDiffAll = lActAll - lTgtAll;
      dvHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:${lDiffAll>=0?'#4ade80':'#f87171'};font-weight:bold">${lDiffAll>=0?'+':''}${fmt(lDiffAll)}</td>`;
      const totalDiffAll = uDiffAll + lDiffAll;
      dvHtml += `<td style="padding:6px 8px;border:1px solid #1e2a45;text-align:right;color:${totalDiffAll>=0?'#4ade80':'#f87171'};font-weight:bold;background:#0f1f38">${totalDiffAll>=0?'+':''}${fmt(totalDiffAll)}</td>`;
      html += `<tr style="border-top:2px solid #1e2a45">${dvHtml}</tr>`;

      return html;
    }

    function salesTableHeader() {
      let h = `<tr style="background:#0a1628;color:#94a3b8;font-size:12px">`;
      h += `<th style="padding:8px;border:1px solid #1e2a45;text-align:left">顧客</th>`;
      h += `<th style="padding:8px;border:1px solid #1e2a45;text-align:left">区分</th>`;
      UPPER_MONTHS.forEach(m => { h += `<th style="padding:8px;border:1px solid #1e2a45;text-align:right">${m}</th>`; });
      h += `<th style="padding:8px;border:1px solid #1e2a45;text-align:right;background:#1a2540">上期計</th>`;
      LOWER_MONTHS.forEach(m => { h += `<th style="padding:8px;border:1px solid #1e2a45;text-align:right">${m}</th>`; });
      h += `<th style="padding:8px;border:1px solid #1e2a45;text-align:right;background:#1a2540">下期計</th>`;
      h += `<th style="padding:8px;border:1px solid #1e2a45;text-align:right;background:#0f1f38">通期合計</th>`;
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
body{background:#0a0e1a;color:#e2e8f5;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;font-size:13px}
.slide{min-height:100vh;background:#0a0e1a;padding:40px 48px;page-break-after:always;display:flex;flex-direction:column}
.panel{background:#0d1120;border:1px solid #1e2a45;border-radius:10px;padding:24px}
.accent{color:#00d4ff}
h1{font-size:32px;font-weight:700;color:#e2e8f5}
h2{font-size:20px;font-weight:700;color:#e2e8f5;margin-bottom:16px}
h3{font-size:15px;font-weight:600;color:#94a3b8;margin-bottom:12px}
.kpi-card{background:#0d1120;border:1px solid #1e2a45;border-radius:10px;padding:20px;flex:1}
.kpi-label{font-size:12px;color:#64748b;margin-bottom:6px}
.kpi-value{font-size:26px;font-weight:700;color:#00d4ff}
.kpi-sub{font-size:11px;color:#64748b;margin-top:4px}
table{width:100%;border-collapse:collapse}
th{background:#0a1628;color:#94a3b8;font-size:12px;padding:8px;border:1px solid #1e2a45;text-align:left;font-weight:600}
td{padding:8px;border:1px solid #1e2a45;color:#e2e8f5}
tr:hover td{background:#0d1628}
.tag{display:inline-block;border-radius:4px;padding:2px 8px;font-size:11px}
@media print{.slide{page-break-after:always}}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:#0a0e1a}
::-webkit-scrollbar-thumb{background:#1e2a45;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#2e3a55}
*{scrollbar-width:thin;scrollbar-color:#1e2a45 #0a0e1a}
</style>
</head>
<body>

<!-- Page 1: Cover -->
<div class="slide" style="justify-content:center;align-items:center;text-align:center;gap:32px">
  <div style="margin-bottom:8px">
    <div style="font-size:13px;color:#64748b;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">CONFIDENTIAL</div>
    <h1 style="font-size:42px;margin-bottom:8px">25期 受託開発案件分析</h1>
    <div style="font-size:22px;color:#00d4ff;font-weight:300;letter-spacing:2px">月次報告資料</div>
  </div>
  <div style="display:flex;gap:24px;justify-content:center;margin:16px 0">
    <div class="panel" style="min-width:180px">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">作成日</div>
      <div style="color:#e2e8f5;font-weight:600">${dateStr}</div>
    </div>

    <div class="panel" style="min-width:180px">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">報告者</div>
      <div style="color:#e2e8f5;font-weight:600">SIユニット 生田目 貴史</div>
    </div>
  </div>
  <div class="panel" style="max-width:600px;width:100%;text-align:left">
    <div style="font-size:13px;color:#94a3b8;margin-bottom:12px;font-weight:600">アジェンダ</div>
    <ol style="list-style:decimal;padding-left:20px;line-height:2;color:#cbd5e1">
      <li>KPI概況と通期見通し</li>
      <li>月別売上推移と傾向</li>
      <li>上期・下期売上詳細</li>
      <li>今後のアクション</li>
    </ol>
  </div>
</div>

<!-- Page 2: KPI Dashboard (Dashboard style) -->
<div class="slide">
  <h2 style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;background:linear-gradient(90deg,#00d4ff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">DASHBOARD</h2>

  <!-- 統計カード上段: 案件数/完了数/見込数/提案中 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
    ${[
      {label:'案件数',  value:totalCount,    color:'var(--accent)'},
      {label:'完了数',  value:doneCount,     color:'var(--accent)'},
      {label:'見込数',  value:forecastCount, color:'var(--accent)'},
      {label:'提案中',  value:proposingCount,color:'var(--accent)'},
    ].map(s => `<div class="panel" style="padding:14px 16px">
      <div style="font-size:12px;color:#6b7fa3;margin-bottom:6px">${s.label}</div>
      <div style="font-size:28px;font-weight:700;color:${s.color}">${s.value}</div>
    </div>`).join('')}
  </div>

  <!-- 統計カード下段: 売上目標/確定売上額/着地予想額 -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    ${[
      {label:'通期売上目標',   value:fmt(totalTarget),              color:'#00d4ff'},
      {label:'確定売上',       value:fmt(totalActual),              color:'#4ade80'},
      {label:'着地予想額（円）', value:fmt(totalActual+totalForecast),color:'#f59e0b'},
    ].map(s => `<div class="panel" style="padding:14px 16px">
      <div style="font-size:12px;color:#6b7fa3;margin-bottom:6px">${s.label}</div>
      <div style="font-size:24px;font-weight:700;color:${s.color}">${s.value}</div>
    </div>`).join('')}
  </div>

  <!-- 月別売上額 -->
  <div class="panel" style="margin-bottom:16px;padding:16px 20px">
    <h3 style="font-size:13px;font-weight:600;color:#e2e8f5;margin-bottom:12px">月別売上額</h3>
    <canvas id="monthlyStackedBar" height="80"></canvas>
  </div>

  <!-- 月別 予実比較 -->
  <div class="panel" style="padding:16px 20px">
    <h3 style="font-size:13px;font-weight:600;color:#e2e8f5;margin-bottom:12px">月別 予実比較</h3>
    <canvas id="yojitsuBar" height="80"></canvas>
  </div>
</div>

<!-- Page 3: Period Comparison + Customer -->
<div class="slide">
  <h2 style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;background:linear-gradient(90deg,#00d4ff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">DASHBOARD</h2>

  <!-- 上期・下期・通期 予実対比 -->
  <div class="panel" style="margin-bottom:16px;padding:16px 20px">
    <h3 style="font-size:13px;font-weight:600;color:#e2e8f5;margin-bottom:12px">上期・下期・通期　予実対比</h3>
    <canvas id="periodBar" height="90"></canvas>
  </div>

  <!-- 上期/下期/通期 サマリーカード -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    ${periodData.map(p => {
      const actual = p.actual + p.forecast;
      const diff   = actual - p.budget;
      const rate   = p.budget > 0 ? Math.round(actual/p.budget*100) : 0;
      const dColor = diff > 0 ? '#34d399' : diff < 0 ? '#ff4d6a' : '#6b7fa3';
      const rColor = rate >= 100 ? '#34d399' : rate >= 80 ? '#facc15' : '#ff4d6a';
      return `<div class="panel" style="padding:14px 16px;font-size:12px">
        <div style="font-weight:700;font-size:13px;color:#6b7fa3;margin-bottom:10px">${p.name}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#6b7fa3">予算</span>
          <span style="color:#3b82f6;font-weight:600">¥${fmt(p.budget)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#6b7fa3">実績${p.forecast>0?'＋見込':''}</span>
          <span style="color:#00d4ff;font-weight:600">¥${fmt(actual)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-top:1px solid #1e2a45;padding-top:4px;margin-top:2px">
          <span style="color:#6b7fa3">差異</span>
          <span style="color:${dColor};font-weight:700">${diff>0?'+':''}¥${fmt(diff)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#6b7fa3">達成率</span>
          <span style="color:${rColor};font-weight:700">${rate}%</span>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- 顧客別 取引実績 -->
  <div class="panel" style="padding:16px 20px">
    <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:16px">
      <h3 style="font-size:13px;font-weight:600;color:#e2e8f5">顧客別 取引実績</h3>
      <span style="font-size:12px;color:#6b7fa3">合計取引額：<span style="color:var(--accent);font-weight:700">¥${fmt(allCustomers.reduce((s,c)=>s+c.total,0))}</span></span>
    </div>
    <div style="display:flex;gap:24px;align-items:center">
      <div style="flex-shrink:0">
        <canvas id="custDonut" width="200" height="200"></canvas>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
        ${allCustomers.map((c,i) => {
          const PIE_COLORS = ['#00d4ff','#e879f9','#84cc16','#f59e0b','#f43f5e','#38bdf8','#34d399','#fb923c','#a78bfa','#2dd4bf','#facc15','#ec4899'];
          const col = PIE_COLORS[i % PIE_COLORS.length];
          return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
            <div style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0"></div>
            <span style="color:#c9d1e8;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</span>
            <span style="color:#e2e8f5;font-weight:600;white-space:nowrap">¥${fmt(c.total)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
</div>

<!-- Page 5: Previous Month Sales -->
<div class="slide">
  <div style="margin-bottom:24px">
    <div style="font-size:11px;color:#64748b;letter-spacing:3px;text-transform:uppercase">PREVIOUS MONTH</div>
    <h2 style="font-size:26px;margin-top:4px">${prevLabel}売上実績</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">${prevLabel}予算合計</div>
      <div class="kpi-value" style="color:#00d4ff">${fmt(prevBudget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${prevLabel}売上実績合計</div>
      <div class="kpi-value" style="color:#4ade80">${fmt(prevActual)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${prevLabel}差異</div>
      <div class="kpi-value" style="color:${prevDiff>=0?'#4ade80':'#f87171'}">${prevDiff>=0?'+':''}${fmt(prevDiff)}</div>
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
          <td style="color:#94a3b8;font-size:12px">${d.customer_name||'-'}</td>
          <td>${d.title||'-'}</td>
          <td style="text-align:right;color:#4ade80;font-weight:600">${fmt(d.amount)}</td>
          <td style="color:#94a3b8;font-size:12px">${d.inspection_date||'-'}</td>
          <td>${badge(d.status)}</td>
        </tr>`).join('')}
        ${prevDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:#e2e8f5">合計</td>
          <td style="text-align:right;color:#4ade80;font-weight:700">${fmt(prevDeals.reduce((s,d)=>s+(Number(d.amount)||0),0))}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 6: Current Month Forecast -->
<div class="slide">
  <div style="margin-bottom:24px">
    <div style="font-size:11px;color:#64748b;letter-spacing:3px;text-transform:uppercase">CURRENT MONTH</div>
    <h2 style="font-size:26px;margin-top:4px">${curLabel}売上予測</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">${curLabel}予算合計</div>
      <div class="kpi-value" style="color:#00d4ff">${fmt(curBudget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${curLabel}売上見込合計</div>
      <div class="kpi-value" style="color:#f59e0b">${fmt(curForecast)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">${curLabel}差異</div>
      <div class="kpi-value" style="color:${curDiff>=0?'#4ade80':'#f87171'}">${curDiff>=0?'+':''}${fmt(curDiff)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">件数</div>
      <div class="kpi-value">${curDeals.length}</div>
      <div class="kpi-sub">件</div>
    </div>
  </div>
  <div class="panel" style="flex:1">
    <div style="font-size:11px;color:#f59e0b;margin-bottom:8px">※ オレンジ色は見込案件</div>
    <table>
      <thead>
        <tr><th>顧客名</th><th>案件名</th><th style="text-align:right">金額</th><th>検収月</th><th>ステータス</th></tr>
      </thead>
      <tbody>
        ${curDeals.map(d => {
          const isFore = FORE_STS.has(d.status);
          return `<tr>
            <td style="color:#94a3b8;font-size:12px">${d.customer_name||'-'}</td>
            <td style="color:${isFore?'#f59e0b':'#e2e8f5'}">${d.title||'-'}</td>
            <td style="text-align:right;color:${isFore?'#f59e0b':'#4ade80'};font-weight:600">${fmt(d.amount)}</td>
            <td style="color:#94a3b8;font-size:12px">${d.inspection_date||'-'}</td>
            <td>${badge(d.status)}</td>
          </tr>`;
        }).join('')}
        ${curDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:#e2e8f5">合計</td>
          <td style="text-align:right;color:#00d4ff;font-weight:700">${fmt(curDeals.reduce((s,d)=>s+(Number(d.amount)||0),0))}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 7: Sales Management Table -->
<div class="slide">
  <div style="margin-bottom:20px">
    <div style="font-size:11px;color:#64748b;letter-spacing:3px;text-transform:uppercase">BUDGET VS ACTUAL</div>
    <h2 style="font-size:26px;margin-top:4px">売上管理表（予実対比）</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">通期予算</div>
      <div class="kpi-value" style="color:#00d4ff">${fmt(totalTarget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">受注額確定</div>
      <div class="kpi-value" style="color:#4ade80">${fmt(totalActual)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">通期見通し</div>
      <div class="kpi-value" style="color:#f59e0b">${fmt(totalActual+totalForecast)}</div>
      <div class="kpi-sub">
        <span style="background:${(totalActual+totalForecast-totalTarget)>=0?'#16a34a33':'#dc262633'};color:${(totalActual+totalForecast-totalTarget)>=0?'#4ade80':'#f87171'};border-radius:4px;padding:2px 6px;font-size:11px">
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
    <div style="font-size:11px;color:#64748b;letter-spacing:3px;text-transform:uppercase">UPPER HALF</div>
    <h2 style="font-size:26px;margin-top:4px">上期 売上一覧（9月〜2月）</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">上期実績合計</div>
      <div class="kpi-value" style="color:#4ade80">${fmt(uActual)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">上期予算</div>
      <div class="kpi-value" style="color:#00d4ff">${fmt(uTarget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">予算比差異</div>
      <div class="kpi-value" style="color:${uDiff>=0?'#4ade80':'#f87171'}">${uDiff>=0?'+':''}${fmt(uDiff)}</div>
      <div class="kpi-sub">達成率: ${uRate}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">仕掛品計上額</div>
      <div class="kpi-value" style="color:#f59e0b">${fmt(shikakakeAmount)}</div>
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
          <td style="color:#94a3b8;font-size:12px">${d.customer_name||'-'}</td>
          <td>${d.title||'-'}</td>
          <td style="text-align:right;color:#4ade80;font-weight:600">${fmt(d.amount)}</td>
          <td style="color:#94a3b8;font-size:12px">${d.inspection_date||'-'}</td>
          <td>${d.status==='shikakake'?`<span class="tag" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44">仕掛かり計上</span>`:''}${d.is_new?`<span class="tag" style="background:#00d4ff22;color:#00d4ff;border:1px solid #00d4ff44;margin-left:4px">NEW</span>`:''}</td>
        </tr>`).join('')}
        ${upperDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:#e2e8f5">上期売上合計</td>
          <td style="text-align:right;color:#4ade80;font-weight:700">${fmt(uActual)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:#00d4ff">上期予算</td>
          <td style="text-align:right;color:#00d4ff;font-weight:700">${fmt(uTarget)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:${uDiff>=0?'#4ade80':'#f87171'}">差異</td>
          <td style="text-align:right;color:${uDiff>=0?'#4ade80':'#f87171'};font-weight:700">${uDiff>=0?'+':''}${fmt(uDiff)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 9: Lower Half Sales -->
<div class="slide">
  <div style="margin-bottom:20px">
    <div style="font-size:11px;color:#64748b;letter-spacing:3px;text-transform:uppercase">LOWER HALF</div>
    <h2 style="font-size:26px;margin-top:4px">下期 売上一覧（3月〜8月）</h2>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div class="kpi-card">
      <div class="kpi-label">下期合計（実績＋見込）</div>
      <div class="kpi-value" style="color:#f59e0b">${fmt(lActual+lForecast)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">下期予算</div>
      <div class="kpi-value" style="color:#00d4ff">${fmt(lTarget)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">予算比差異</div>
      <div class="kpi-value" style="color:${lDiff>=0?'#4ade80':'#f87171'}">${lDiff>=0?'+':''}${fmt(lDiff)}</div>
      <div class="kpi-sub">円</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">見込案件合計</div>
      <div class="kpi-value" style="color:#f59e0b">${fmt(lForecast)}</div>
      <div class="kpi-sub">円</div>
    </div>
  </div>
  ${lDiff < 0 ? `<div style="background:#f8717122;border:1px solid #f87171;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#f87171;font-size:13px">
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
            <td style="color:#94a3b8;font-size:12px">${d.customer_name||'-'}</td>
            <td style="color:${isFore?'#f59e0b':'#e2e8f5'}">${d.title||'-'}</td>
            <td style="text-align:right;color:${isFore?'#f59e0b':'#4ade80'};font-weight:600">${fmt(d.amount)}</td>
            <td style="color:#94a3b8;font-size:12px">${d.inspection_date||'-'}</td>
            <td>
              ${isFore?`<span class="tag" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44">見込</span>`:''}
              ${d.status==='shikakake'?`<span class="tag" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;margin-left:4px">仕掛かり計上</span>`:''}
              ${d.is_new?`<span class="tag" style="background:#00d4ff22;color:#00d4ff;border:1px solid #00d4ff44;margin-left:4px">NEW</span>`:''}
            </td>
          </tr>`;
        }).join('')}
        ${lowerDeals.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px">データなし</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:#f59e0b">下期売上合計（実績＋見込）</td>
          <td style="text-align:right;color:#f59e0b;font-weight:700">${fmt(lActual+lForecast)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:#00d4ff">下期予算</td>
          <td style="text-align:right;color:#00d4ff;font-weight:700">${fmt(lTarget)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background:#0a1628">
          <td colspan="2" style="font-weight:700;color:${lDiff>=0?'#4ade80':'#f87171'}">差異</td>
          <td style="text-align:right;color:${lDiff>=0?'#4ade80':'#f87171'};font-weight:700">${lDiff>=0?'+':''}${fmt(lDiff)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Page 10: Summary & Actions -->
<div class="slide">
  <div style="margin-bottom:24px">
    <div style="font-size:11px;color:#64748b;letter-spacing:3px;text-transform:uppercase">SUMMARY & ACTIONS</div>
    <h2 style="font-size:26px;margin-top:4px">まとめ・今後のアクション</h2>
  </div>
  <div style="display:flex;gap:16px;flex:1">
    <div class="panel" style="flex:1">
      <h3>全体所感・分析</h3>
      <div style="line-height:2;color:#94a3b8;font-size:13px">
        <p style="margin-bottom:12px">予想達成率は <strong style="color:${achieveRate>=100?'#4ade80':achieveRate>=80?'#f59e0b':'#f87171'};font-size:16px">${achieveRate}%</strong> です。</p>
        <p style="margin-bottom:14px;line-height:1.9;color:#cbd5e1">
          上期は新規・既存案件ともに順調に売上を積み上げ、予算を大幅にリードする結果となった。
          下期は案件の端境期に伴い一時的に売上がへこむ局面となるが、
          岩倉建設・セルコホームをはじめとする既受注案件の検収が予定通りに進めば、
          通期で予算を <strong style="color:#4ade80">約950万円上回るプラス着地</strong> が見込まれる。
          引き続き下期案件の進捗管理と新規提案活動を両輪で推進し、着実な予算超過達成を目指す。
        </p>
        <ul style="list-style:disc;padding-left:20px;line-height:2.2">
          <li>確定売上: <strong style="color:#4ade80">${fmt(totalActual)}</strong> 円</li>
          <li>見込売上: <strong style="color:#f59e0b">${fmt(totalForecast)}</strong> 円</li>
          <li>通期予算: <strong style="color:#00d4ff">${fmt(totalTarget)}</strong> 円</li>
          <li>上期達成率: <strong style="color:${uRate>=100?'#4ade80':uRate>=80?'#f59e0b':'#f87171'}">${uRate}%</strong></li>
        </ul>
      </div>
    </div>
    <div class="panel" style="flex:1">
      <h3>重点リスク・課題</h3>
      <div style="line-height:2">
        <div style="background:#f8717122;border-left:3px solid #f87171;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:10px;font-size:13px;color:#fca5a5">
          <strong>【最重要】</strong> 岩倉建設・セルコホームの納品完遂が通期目標達成の最重要課題
        </div>
        <ul style="list-style:disc;padding-left:20px;color:#94a3b8;font-size:13px;line-height:2.2">
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
        <div style="background:#0a1628;border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:#3b82f622;color:#3b82f6;border:1px solid #3b82f644;border-radius:4px;padding:2px 8px;font-size:11px">今月</span>
            <span style="font-weight:600;font-size:13px">見込案件のクロージング</span>
          </div>
          <p style="color:#64748b;font-size:12px">見込ステータス案件の提案完了・受注確定を推進</p>
        </div>
        <div style="background:#0a1628;border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;border-radius:4px;padding:2px 8px;font-size:11px">今四半期</span>
            <span style="font-weight:600;font-size:13px">下期パイプラインの構築</span>
          </div>
          <p style="color:#64748b;font-size:12px">下期目標達成に向けた新規商談の創出</p>
        </div>
        <div style="background:#0a1628;border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:#a855f722;color:#a855f7;border:1px solid #a855f744;border-radius:4px;padding:2px 8px;font-size:11px">継続</span>
            <span style="font-weight:600;font-size:13px">既存顧客の深耕・拡大</span>
          </div>
          <p style="color:#64748b;font-size:12px">主要顧客への追加提案・新規ニーズ発掘</p>
        </div>
        <div style="background:#0a1628;border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:#4ade8022;color:#4ade80;border:1px solid #4ade8044;border-radius:4px;padding:2px 8px;font-size:11px">随時</span>
            <span style="font-weight:600;font-size:13px">案件情報の精度向上</span>
          </div>
          <p style="color:#64748b;font-size:12px">CRMデータの定期更新・ステータス管理の徹底</p>
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
    var gaugeColor = rate >= 100 ? '#4ade80' : rate >= 80 ? '#f59e0b' : '#f87171';
    new Chart(gaugeCtx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [clampedRate, 100 - clampedRate],
          backgroundColor: [gaugeColor, '#1e2a45'],
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
          { label: '実績', data: DATA.monthActual,   backgroundColor: '#00d4ff', borderRadius: 2, stack: 'a' },
          { label: '見込', data: DATA.monthForecast, backgroundColor: '#fb923c', borderRadius: 2, stack: 'a' }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true, ticks: { color: '#6b7fa3', font: { size: 11 } }, grid: { color: '#131825' } },
          y: { stacked: true, ticks: { color: '#6b7fa3', font: { size: 11 }, callback: function(v) { return '¥' + (v/10000).toFixed(0) + '万'; } }, grid: { color: '#131825' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 14, padding: 12 } },
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
    var yBar2Colors = DATA.yojitsuData.map(function(d) { return d.hasActual ? '#00d4ff' : '#fb923c'; });
    new Chart(yojitsuCtx, {
      type: 'bar',
      data: {
        labels: yLabels,
        datasets: [
          { label: '目標', data: yTarget, backgroundColor: '#3b82f6', borderRadius: 2 },
          { label: '実績', data: yBar2,   backgroundColor: yBar2Colors, borderRadius: 2 },
          { label: '見込', data: yBar3,   backgroundColor: '#fb923c', borderRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: '#6b7fa3', font: { size: 11 } }, grid: { color: '#131825' } },
          y: { ticks: { color: '#6b7fa3', font: { size: 11 }, callback: function(v) { return '¥' + (v/10000).toFixed(0) + '万'; } }, grid: { color: '#131825' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 14, padding: 12 } },
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
          { label: '予算', data: DATA.periodData.map(function(p) { return p.budget; }),           backgroundColor: '#3b82f6', borderRadius: 4 },
          { label: '実績', data: DATA.periodData.map(function(p) { return p.actual; }),           backgroundColor: '#00d4ff', borderRadius: 4 },
          { label: '見込', data: DATA.periodData.map(function(p) { return p.forecast; }),         backgroundColor: '#fb923c', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: '#c9d1e8', font: { size: 13, weight: '600' } }, grid: { display: false } },
          y: { ticks: { color: '#6b7fa3', font: { size: 11 }, callback: function(v) { return (v/10000).toFixed(0) + '万'; } }, grid: { color: '#131825' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 14, padding: 12 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label + '：¥' + Number(ctx.raw||0).toLocaleString(); } } }
        }
      }
    });
  }

  // Customer Donut (Page 3)
  var custDonutCtx = document.getElementById('custDonut');
  if (custDonutCtx) {
    var PIE_COLORS = ['#00d4ff','#e879f9','#84cc16','#f59e0b','#f43f5e','#38bdf8','#34d399','#fb923c','#a78bfa','#2dd4bf','#facc15','#ec4899'];
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
          backgroundColor: ['#4ade80', '#f59e0b', '#a855f7', '#6b7280'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } }
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
