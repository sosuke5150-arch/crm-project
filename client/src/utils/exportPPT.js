const API = 'http://localhost:3001';

export async function exportPPT() {
  const res = await fetch(`${API}/export-ppt`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'サーバーエラー' }));
    throw new Error(err.error || 'PPT生成に失敗しました');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''(.+)/);
  const fileName = match ? decodeURIComponent(match[1]) : '会議資料.pptx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
