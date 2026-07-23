/** Fixed 30 ajzāʾ — labels for lesson-track UI (not tenant-specific). */
export const QURAN_PARAS = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1
  return {
    id: n,
    ur: `سپارہ ${n}`,
    en: `Juz ${n} / Para ${n}`,
  }
})

export function paraLabel(paraId, lng) {
  const p = QURAN_PARAS.find((x) => x.id === paraId)
  if (!p) return ''
  return lng === 'en' ? p.en : p.ur
}
