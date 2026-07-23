import { Student } from '../models/Student.js';
import { Grade } from '../models/Grade.js';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Letters and digits only — keeps roll compact and URL-safe */
function sanitizeCode(code) {
  const t = String(code || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 12);
  return t || 'G';
}

/**
 * Next roll number for a class: `{code}-{year}-{#####}`
 * Example: `G7A-2026-00001`
 * Scoped by tenant + grade document + academic year on the grade.
 */
export async function nextRollNumberForGrade(tenantId, gradeId) {
  if (!gradeId) return '';

  const grade = await Grade.findOne({ _id: gradeId, tenantId }).lean();
  if (!grade) return '';

  const yr = grade.year;
  const code = sanitizeCode(grade.code);
  const prefix = `${code}-${yr}-`;
  const pattern = new RegExp(`^${escapeRegex(prefix)}\\d{5}$`);

  const peers = await Student.find({
    tenantId,
    currentGradeId: gradeId,
    rollNumber: pattern,
  })
    .select('rollNumber')
    .lean();

  let max = 0;
  for (const s of peers) {
    const m = s.rollNumber && s.rollNumber.match(/(\d{5})$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }

  const next = max + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
