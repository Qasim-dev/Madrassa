import { AttendanceCategory } from '../models/AttendanceCategory.js';
import { AttendanceSlot } from '../models/AttendanceSlot.js';
import { TenantSettings } from '../models/TenantSettings.js';
import { DEFAULT_CATEGORIES, DEFAULT_SLOTS_BY_CATEGORY } from '../constants/attendanceEnums.js';

/**
 * Ensure default attendance categories + slots exist for a tenant.
 * Merges TenantSettings.attendanceTimes into academic period labels when present.
 */
export async function ensureAttendanceDefaults(tenantId) {
  const existing = await AttendanceCategory.find({ tenantId }).lean();
  const byCode = Object.fromEntries(existing.map((c) => [c.code, c]));

  for (const def of DEFAULT_CATEGORIES) {
    if (!byCode[def.code]) {
      const created = await AttendanceCategory.create({ tenantId, ...def, isActive: true });
      byCode[def.code] = created.toObject();
    }
  }

  const settings = await TenantSettings.findOne({ tenantId }).lean();
  const timeLabels = (settings?.attendanceTimes || []).filter(Boolean);

  for (const [code, cat] of Object.entries(byCode)) {
    const slotDefs = DEFAULT_SLOTS_BY_CATEGORY[code] || [];
    const count = await AttendanceSlot.countDocuments({ tenantId, categoryId: cat._id });
    if (count > 0) continue;

    const docs = slotDefs.map((s, idx) => {
      let label = s.label;
      if (code === 'academic' && timeLabels[idx]) {
        label = { ur: timeLabels[idx], en: timeLabels[idx] };
      }
      return {
        tenantId,
        categoryId: cat._id,
        sessionId: null,
        code: s.code,
        label,
        sortOrder: s.sortOrder ?? idx + 1,
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        dayOfWeek: [],
        isActive: true,
      };
    });

    if (docs.length) await AttendanceSlot.insertMany(docs);
  }

  return AttendanceCategory.find({ tenantId, isActive: true }).sort({ sortOrder: 1 }).lean();
}

export async function getCategoryByCode(tenantId, code) {
  await ensureAttendanceDefaults(tenantId);
  return AttendanceCategory.findOne({ tenantId, code: String(code).toLowerCase(), isActive: true }).lean();
}
