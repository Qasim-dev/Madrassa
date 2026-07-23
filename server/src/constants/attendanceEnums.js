/** Core attendance category codes — add rows in DB for new categories (e.g. tarbiyah). */
export const ATTENDANCE_CATEGORY_CODES = [
  'academic',
  'hifz',
  'salah',
  'hostel',
  'staff',
];

export const STUDENT_STATUSES = ['present', 'absent', 'sick', 'late', 'excused', 'leave'];

export const TEACHER_STATUSES = ['present', 'absent', 'late', 'half_day', 'leave', 'excused', 'sick'];

export const DEFAULT_CATEGORIES = [
  {
    code: 'academic',
    name: { ur: 'درسی', en: 'Academic' },
    subjectType: 'student',
    slotMode: 'timetable',
    statusOptions: ['present', 'absent', 'sick', 'late', 'excused'],
    requiresGrade: true,
    requiresSlot: true,
    affectsSalary: false,
    sortOrder: 1,
  },
  {
    code: 'hifz',
    name: { ur: 'حفظ', en: 'Hifz' },
    subjectType: 'student',
    slotMode: 'fixed_slots',
    statusOptions: ['present', 'absent', 'sick', 'late'],
    requiresGrade: true,
    requiresSlot: true,
    affectsSalary: false,
    sortOrder: 2,
  },
  {
    code: 'salah',
    name: { ur: 'نماز', en: 'Salah' },
    subjectType: 'student',
    slotMode: 'fixed_slots',
    statusOptions: ['present', 'absent', 'excused'],
    requiresGrade: false,
    requiresSlot: true,
    affectsSalary: false,
    sortOrder: 3,
  },
  {
    code: 'hostel',
    name: { ur: 'ہاسٹل', en: 'Hostel' },
    subjectType: 'student',
    slotMode: 'fixed_slots',
    statusOptions: ['present', 'absent', 'leave'],
    requiresGrade: false,
    requiresSlot: true,
    affectsSalary: false,
    sortOrder: 4,
  },
  {
    code: 'staff',
    name: { ur: 'اساتذہ و عملہ', en: 'Staff' },
    subjectType: 'teacher',
    slotMode: 'fixed_slots',
    statusOptions: ['present', 'absent', 'late', 'half_day', 'leave', 'excused'],
    requiresGrade: false,
    requiresSlot: true,
    affectsSalary: true,
    sortOrder: 5,
  },
];

/** Default slots seeded per category when tenant has none. */
export const DEFAULT_SLOTS_BY_CATEGORY = {
  academic: [
    { code: 'p1', label: { ur: 'پیریڈ ۱', en: 'Period 1' }, sortOrder: 1 },
    { code: 'p2', label: { ur: 'پیریڈ ۲', en: 'Period 2' }, sortOrder: 2 },
    { code: 'p3', label: { ur: 'پیریڈ ۳', en: 'Period 3' }, sortOrder: 3 },
    { code: 'p4', label: { ur: 'پیریڈ ۴', en: 'Period 4' }, sortOrder: 4 },
    { code: 'p5', label: { ur: 'پیریڈ ۵', en: 'Period 5' }, sortOrder: 5 },
    { code: 'p6', label: { ur: 'پیریڈ ۶', en: 'Period 6' }, sortOrder: 6 },
  ],
  hifz: [
    { code: 'hifz_morning', label: { ur: 'صبح کا حفظ', en: 'Morning Hifz' }, sortOrder: 1 },
    { code: 'hifz_evening', label: { ur: 'شام کا حفظ', en: 'Evening Hifz' }, sortOrder: 2 },
  ],
  salah: [
    { code: 'fajr', label: { ur: 'فجر', en: 'Fajr' }, sortOrder: 1, startTime: '05:30', endTime: '06:30' },
    { code: 'zuhr', label: { ur: 'ظہر', en: 'Zuhr' }, sortOrder: 2, startTime: '12:30', endTime: '13:30' },
    { code: 'asr', label: { ur: 'عصر', en: 'Asr' }, sortOrder: 3, startTime: '16:00', endTime: '17:00' },
    { code: 'maghrib', label: { ur: 'مغرب', en: 'Maghrib' }, sortOrder: 4, startTime: '18:30', endTime: '19:00' },
    { code: 'isha', label: { ur: 'عشاء', en: 'Isha' }, sortOrder: 5, startTime: '20:00', endTime: '21:00' },
  ],
  hostel: [
    { code: 'night_roll', label: { ur: 'رات کی حاضری', en: 'Night roll call' }, sortOrder: 1 },
    { code: 'morning_wake', label: { ur: 'صبح کی حاضری', en: 'Morning check-in' }, sortOrder: 2 },
  ],
  staff: [
    { code: 'morning_duty', label: { ur: 'صبح کی ڈیوٹی', en: 'Morning duty' }, sortOrder: 1 },
    { code: 'teaching', label: { ur: 'تدریس', en: 'Teaching period' }, sortOrder: 2 },
    { code: 'admin', label: { ur: 'انتظامی', en: 'Administrative' }, sortOrder: 3 },
    { code: 'sign_out', label: { ur: 'رخصت', en: 'Sign-out' }, sortOrder: 4 },
  ],
};
