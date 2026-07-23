function csvEscape(v) {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCsv({ filename, headers, rows }) {
  const head = headers.map(csvEscape).join(',')
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\n')
  // BOM for Excel Urdu/UTF-8
  const csv = `\ufeff${head}\n${body}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

