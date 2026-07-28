export function col(header, cellFn) {
  return { key: header, header, cell: cellFn }
}
