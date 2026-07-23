import XLSX from 'xlsx';

function normHeader(h) {
  return String(h || '').trim();
}

function normCell(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return v;
}

export function readWorkbook(buffer) {
  return XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
}

export function sheetToRowsByHeader(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  const rawHeaders = (matrix[0] || []).map(normHeader);
  const headers = rawHeaders.map((h, idx) => (h ? h : `__col_${idx + 1}`));

  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const arr = matrix[r] || [];
    // ignore empty rows
    if (arr.every((x) => String(normCell(x)) === '')) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = normCell(arr[c]);
    }
    rows.push({ __rowNum: r + 1, ...obj });
  }

  return { headers, rows };
}

/** First non-empty cell among aliases (exact header keys). */
export function cell(row, ...keys) {
  if (!row) return '';
  for (const k of keys) {
    if (k == null) continue;
    if (Object.prototype.hasOwnProperty.call(row, k) && row[k] != null && String(row[k]).trim() !== '') {
      return typeof row[k] === 'string' ? row[k].trim() : String(row[k]).trim();
    }
  }
  return '';
}

/**
 * Accept common real-world date strings:
 * YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, D/M/YYYY, Excel Date objects.
 */
export function parseFlexibleDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Excel serial (days since 1899-12-30) — rare with raw:false but keep safe
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + Math.round(v) * 86400000);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const s = String(v).trim();
  if (!s) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
  if (m) {
    const day = +m[1];
    const month = +m[2];
    const year = +m[3];
    // Prefer DMY (common in PK / Urdu sheets). If month > 12, swap.
    let dd = day;
    let mm = month;
    if (mm > 12 && dd <= 12) {
      dd = month;
      mm = day;
    }
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const d = new Date(Date.UTC(year, mm - 1, dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }
  return null;
}

/** @deprecated use parseFlexibleDate — kept for older callers */
export function parseDateCell(v) {
  return parseFlexibleDate(v);
}

export function localizedFromRow(row, baseKey) {
  const ur = row[`${baseKey}.ur`];
  const en = row[`${baseKey}.en`];
  return { ur: ur ? String(ur).trim() : '', en: en ? String(en).trim() : '' };
}

/**
 * Like localizedFromRow, but also accepts alternate ur-only header keys
 * and a bare baseKey as Urdu text.
 */
export function localizedFromRowFlexible(row, baseKey, urAliases = []) {
  const ur =
    cell(row, `${baseKey}.ur`, ...urAliases, baseKey) ||
    (row[`${baseKey}.ur`] != null ? String(row[`${baseKey}.ur`]).trim() : '');
  const en = cell(row, `${baseKey}.en`, `${baseKey}En`, `${baseKey}_en`);
  return { ur: ur || '', en: en || '' };
}
