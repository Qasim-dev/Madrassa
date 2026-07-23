/**
 * Keys returned by GET /api/settings (tenant-scoped via auth).
 * Import `useGetSettingsQuery` and read these paths for dropdowns / validation elsewhere.
 */
export const TARTIBAT_SETTING_KEYS = {
  registeredAddresses: 'registeredAddresses',
  countries: 'countries',
  districts: 'districts',
  previousMadarisNames: 'previousMadarisNames',
  examNames: 'examNames',
  lessonNames: 'lessonNames',
  attendanceTimes: 'attendanceTimes',
  withdrawalReasons: 'withdrawalReasons',
}
