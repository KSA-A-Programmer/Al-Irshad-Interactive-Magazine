/**
 * Deploy this script from the TEST Google account as a Web App.
 * Execute as: Me; Access: Anyone. This endpoint is public, so do not store personal information.
 * Sheet is private to its owner. Use anonymous responses only.
 */
const SHEET_NAME = 'إجابات المجلة';
function doPost(e) {
  try {
    const payload = JSON.parse(e.parameter.payload || '{}');
    if (!payload || typeof payload !== 'object') throw Error('Invalid payload');
    const json = JSON.stringify(payload);
    if (json.length > 150000) throw Error('Payload too large');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['وقت الاستلام', 'معرف المشاركة', 'رقم الصفحة', 'معرف السؤال', 'الإجابة']);
      sheet.setFrozenRows(1);
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const rows = [];
      const timestamp = new Date();
      const submissionId = String(payload.submissionId || '').slice(0,80);
      const answers = payload.answers || {};
      Object.keys(answers).slice(0,300).forEach(k => {
        const v = answers[k];
        if (v === false || v === '' || v == null) return;
        rows.push([timestamp,submissionId,String(k).split(':')[0],safe(k),safe(v === true ? '✓' : v)]);
      });
      const manual = payload.manual || {};
      Object.keys(manual).forEach(p => (manual[p] || []).slice(0,100).forEach((m,i) => {
        rows.push([timestamp,submissionId,safe(p),'إضافة يدوية '+(i+1),safe(m.text)]);
      }));
      if (rows.length) sheet.getRange(sheet.getLastRow()+1,1,rows.length,5).setValues(rows);
    } finally {lock.releaseLock()}
    return ContentService.createTextOutput('OK');
  } catch(err) {return ContentService.createTextOutput('ERROR: '+err.message)}
}
// Prevent spreadsheet formula injection from arbitrary answer text.
function safe(v){const s=String(v).slice(0,5000);return /^[=+\-@]/.test(s) ? "'"+s : s;}
