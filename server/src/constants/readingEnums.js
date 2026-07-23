export const READING_STATUS = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});

/** @param {number} currentPage @param {number} totalPages */
export function computeReadingStatus(currentPage, totalPages) {
  if (!totalPages || totalPages < 1) return READING_STATUS.NOT_STARTED;
  if (!currentPage || currentPage <= 0) return READING_STATUS.NOT_STARTED;
  if (currentPage >= totalPages) return READING_STATUS.COMPLETED;
  return READING_STATUS.IN_PROGRESS;
}

/** @param {number} currentPage @param {number} totalPages */
export function computeReadingPercentage(currentPage, totalPages) {
  if (!totalPages || totalPages < 1) return 0;
  const pct = (Math.min(currentPage, totalPages) / totalPages) * 100;
  return Math.round(pct * 100) / 100;
}

/** @param {number} startPage @param {number} endPage */
export function computePagesRead(startPage, endPage) {
  return endPage - startPage + 1;
}

/** Ranges [a,b] and [c,d] overlap when they share at least one page. */
export function pageRangesOverlap(a, b, c, d) {
  return !(b < c || d < a);
}
