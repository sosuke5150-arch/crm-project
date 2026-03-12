import ExcelJS from 'exceljs';

// 主要顧客ID（定期保守開発案件として分類）
const MAIN_CUSTOMER_IDS = new Set([5, 3]);

const STATUS_LABELS = {
  proposing: '提案中', planned: '提案予定', won: '受注', developing: '開発中',
  shikakake: '仕掛計上', monthly: '月額', done: '完了', forecast: '見込',
};

// 検収月 → 年表示（25期: 9月〜8月）
const FISCAL_YEAR_MAP = {
  '9月': 2025, '10月': 2025, '11月': 2025, '12月': 2025,
  '1月': 2026, '2月': 2026, '3月': 2026, '4月': 2026,
  '5月': 2026, '6月': 2026, '7月': 2026, '8月': 2026,
};

function yearMonth(inspectionMonth) {
  const m = inspectionMonth.replace('検収', '');
  const y = FISCAL_YEAR_MAP[m] || new Date().getFullYear();
  return `${y}年${m}`;
}

const FILL_GRAY   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF595959' } };
const FILL_YELLOW = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

export async function exportMonthlyReport(deals, targets, inspectionMonth) {
  const monthLabel = inspectionMonth.replace('検収', ''); // "2月"
  const title = yearMonth(inspectionMonth);               // "2026年2月"

  const monthDeals = deals.filter(d => d.inspection_date === inspectionMonth);
  const teikiDeals = monthDeals.filter(d => MAIN_CUSTOMER_IDS.has(Number(d.customer_id)));
  const spotDeals  = monthDeals.filter(d => !MAIN_CUSTOMER_IDS.has(Number(d.customer_id)));

  const teikiTotal = teikiDeals.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const spotTotal  = spotDeals.reduce((s, d)  => s + (Number(d.amount) || 0), 0);
  const grandTotal = teikiTotal + spotTotal;

  const teikiBudget = [5, 3].reduce((s, cid) => s + (Number(targets[`${cid}_${monthLabel}`]) || 0), 0);
  const spotBudget  = Number(targets[`0_${monthLabel}`]) || 0;
  const grandBudget = teikiBudget + spotBudget;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('月次報告');

  ws.columns = [
    { width: 18 },  // 顧客
    { width: 36 },  // プロジェクト
    { width: 12 },  // ステータス
    { width: 16 },  // 金額
    { width: 12 },  // 検収
    { width: 48 },  // トピックス
  ];

  // タイトル行
  const titleRow = ws.addRow([`■次月売上（${title}）`, '', '', '', '', '']);
  ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`);
  titleRow.getCell('A').font = { bold: true, size: 13 };
  ws.addRow([]);

  const addSection = (label, sectionDeals, total, budget, amountHeader) => {
    // セクションヘッダー
    const secRow = ws.addRow([`【${label}】`, '', '', '', '', '']);
    ws.mergeCells(`A${secRow.number}:F${secRow.number}`);
    secRow.getCell('A').font = { bold: true, size: 11 };

    // テーブルヘッダー
    const hRow = ws.addRow(['顧客', 'プロジェクト', 'ステータス', amountHeader, '検収(予定)完了', 'トピックス']);
    hRow.eachCell(cell => {
      cell.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill  = FILL_GRAY;
      cell.alignment = { vertical: 'middle', wrapText: false };
    });

    // データ行
    sectionDeals.forEach(d => {
      const row = ws.addRow([
        d.customer_name || '',
        d.title || '',
        STATUS_LABELS[d.status] || d.status || '',
        Number(d.amount) || 0,
        (d.inspection_date || '').replace('検収', '末'),
        d.topics || '',
      ]);
      row.getCell(4).numFmt = '#,##0';
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { wrapText: true };
    });

    // 小計行: 合計
    const r1 = ws.addRow(['', '', '', `${monthLabel}合計`, total, '']);
    r1.getCell(4).font = { bold: true };
    r1.getCell(4).alignment = { horizontal: 'right' };
    r1.getCell(5).numFmt = '#,##0';
    r1.getCell(5).font = { bold: true };
    r1.getCell(5).alignment = { horizontal: 'right' };

    // 小計行: 予算
    const r2 = ws.addRow(['', '', '', `${monthLabel}予算`, budget, '']);
    r2.getCell(4).alignment = { horizontal: 'right' };
    r2.getCell(5).numFmt = '#,##0';
    r2.getCell(5).alignment = { horizontal: 'right' };

    // 小計行: 差異（黄色背景）
    const diff = total - budget;
    const r3 = ws.addRow(['', '', '', '差異', diff, '']);
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
      r3.getCell(col).fill = FILL_YELLOW;
    });
    r3.getCell(4).font = { bold: true };
    r3.getCell(4).alignment = { horizontal: 'right' };
    r3.getCell(5).numFmt = '+#,##0;-#,##0;0';
    r3.getCell(5).alignment = { horizontal: 'right' };
    r3.getCell(5).font = { bold: true, color: { argb: diff >= 0 ? 'FF0000CC' : 'FFCC0000' } };

    ws.addRow([]);
  };

  addSection('定期保守開発案件', teikiDeals, teikiTotal, teikiBudget, '金額(月額)');
  addSection('スポット開発案件', spotDeals, spotTotal, spotBudget, '金額');

  // 開発案件合計
  const totalSecRow = ws.addRow(['【開発案件合計】', '', '', '', '', '']);
  ws.mergeCells(`A${totalSecRow.number}:F${totalSecRow.number}`);
  totalSecRow.getCell('A').font = { bold: true, size: 11 };

  const g1 = ws.addRow(['', '', '', `${monthLabel}合計`, grandTotal, '']);
  g1.getCell(4).font = { bold: true };
  g1.getCell(4).alignment = { horizontal: 'right' };
  g1.getCell(5).numFmt = '#,##0';
  g1.getCell(5).font = { bold: true };
  g1.getCell(5).alignment = { horizontal: 'right' };

  const g2 = ws.addRow(['', '', '', `${monthLabel}予算`, grandBudget, '']);
  g2.getCell(4).alignment = { horizontal: 'right' };
  g2.getCell(5).numFmt = '#,##0';
  g2.getCell(5).alignment = { horizontal: 'right' };

  const grandDiff = grandTotal - grandBudget;
  const g3 = ws.addRow(['', '', '', '差異', grandDiff, '']);
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
    g3.getCell(col).fill = FILL_YELLOW;
  });
  g3.getCell(4).font = { bold: true };
  g3.getCell(4).alignment = { horizontal: 'right' };
  g3.getCell(5).numFmt = '+#,##0;-#,##0;0';
  g3.getCell(5).alignment = { horizontal: 'right' };
  g3.getCell(5).font = { bold: true, color: { argb: grandDiff >= 0 ? 'FF0000CC' : 'FFCC0000' } };

  // ダウンロード
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `月次報告_${title}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
