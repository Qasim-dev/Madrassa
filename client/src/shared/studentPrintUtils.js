import { loc, uiLang } from './localized'

export function ageFromDob(dob) {
  if (!dob) return null
  const d = dob instanceof Date ? dob : new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let years = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years -= 1
  return years
}

/** Current class: prefer tartibat شعبہ then درجہ (not legacy Grade). */
export function studentClassLabel(student, lng) {
  const darjah = student.darjahId
  const subject = student.subjectId

  if (darjah?.name || subject?.name) {
    const darjahName = darjah?.name ? loc(darjah.name, lng) : ''
    const code = darjah?.code ? String(darjah.code).trim() : ''
    const darjahLine =
      darjahName && code && code !== darjahName ? `${darjahName} (${code})` : darjahName
    const subjectName = subject?.name ? loc(subject.name, lng) : ''
    if (subjectName && darjahLine) return `${subjectName} — ${darjahLine}`
    return subjectName || darjahLine || '—'
  }

  const grade = student.currentGradeId || student.gradeId
  if (grade?.name) {
    const sep = lng?.toLowerCase().startsWith('en') ? ' — ' : ' - '
    return [loc(grade.name, lng), grade.section].filter(Boolean).join(sep)
  }
  return '—'
}

export function studentPrintLabels(lng, tenantName) {
  const en = lng?.toLowerCase().startsWith('en')
  return {
    en,
    lang: uiLang(lng),
    title: en ? 'Student registration' : 'طالب علم کا داخلہ فارم',
    institution: tenantName || (en ? 'Institution' : 'جامعہ / مدرسہ'),
    basic: en ? 'Basic information' : 'بنیادی معلومات',
    guardian: en ? "Guardian's information" : 'سرپرست کی معلومات',
    prevSchools: en ? 'Previous schools' : 'سابقہ مدارس',
    classHist: en ? 'Class history' : 'کلاس کی تاریخ',
    office: en ? 'For office use' : 'دفتری استعمال کے لئے',
    name: en ? 'Student name' : 'نام طالب علم',
    father: en ? "Father's name" : 'ولدیت',
    reg: en ? 'Registration no.' : 'رجسٹریشن نمبر',
    cnic: en ? 'CNIC' : 'شناختی کارڈ نمبر',
    dob: en ? 'Date of birth' : 'تاریخ پیدائش',
    age: en ? 'Age (years)' : 'عمر',
    class: en ? 'Current class' : 'موجودہ درجہ',
    addrCur: en ? 'Current address' : 'موجودہ پتہ',
    addrPerm: en ? 'Permanent address' : 'مستقل پتہ',
    enroll: en ? 'Admission date' : 'تاریخ داخلہ',
    phone: en ? 'Phone' : 'فون نمبر',
    secular: en ? 'Secular education' : 'عصری تعلیم',
    affiliation: en ? 'Affiliation' : 'الحاق',
    roll: en ? 'Roll no.' : 'رول نمبر',
    entry: en ? 'Entry date' : 'اندراج کی تاریخ',
    exit: en ? 'Exit date' : 'اخراج کی تاریخ',
    exitReason: en ? 'Reason for exit' : 'اخراج کی وجہ',
    ongoing: en ? 'Ongoing' : 'جاری',
    studentSign: en ? 'Student signature' : 'دستخط طالب علم',
    guardianSign: en ? 'Guardian signature' : 'دستخط سرپرست',
    principal: en ? 'Principal' : 'مہتمم',
    footer: en ? 'Madrasa management system' : 'مدرسہ مینجمنٹ سسٹم',
    printBtn: en ? 'Print' : 'پرنٹ کریں',
    back: en ? 'Back' : 'واپس',
    rel: en ? 'Relation' : 'رشتہ',
    profession: en ? 'Profession' : 'پیشہ',
    year: en ? 'Year' : 'سال',
    gradeCol: en ? 'Class' : 'درجہ',
    institute: en ? 'Institute' : 'جامعہ/مدرسہ',
    marks: en ? 'Marks' : 'نمبرات',
    result: en ? 'Result' : 'تقدیر',
    classCol: en ? 'Class' : 'کلاس',
    type: en ? 'Type' : 'قسم',
    address: en ? 'Address' : 'پتہ',
    photo: en ? 'Photo' : 'تصویر',
    officeNotes: en ? 'Admission / exam notes:' : 'داخلہ / امتحان کی نوٹس:',
    examiner: en ? 'Examiner' : 'ممتحن',
    seal: en ? 'Seal' : 'مہر',
  }
}

export function addrLine(v, lng) {
  if (!v) return '—'
  const a = loc(v, lng)
  return a || '—'
}
