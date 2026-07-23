import { toInputDate } from './formatDisplayDate.js'

export const emptyLoc = () => ({ ur: '', en: '' })

export { toInputDate }

export function normalizeRelation(rel) {
  if (!rel) return emptyLoc()
  if (typeof rel === 'string') return { ur: rel, en: rel }
  return { ur: rel.ur || '', en: rel.en || '' }
}

export function defaultForm() {
  return {
    sessionId: '',
    studentId: '',
    photoUrl: '',
    name: emptyLoc(),
    darjahId: '',
    subjectId: '',
    bookId: '',
    bookIds: [],
    teacherId: '',
    fatherName: emptyLoc(),
    gender: '',
    idCard: '',
    dateOfBirth: '',
    phone: '',
    city: '',
    country: emptyLoc(),
    state: emptyLoc(),
    cityLoc: emptyLoc(),
    districtCurrent: emptyLoc(),
    districtPermanent: emptyLoc(),
    addressCurrent: emptyLoc(),
    addressPermanent: emptyLoc(),
    classTypeLabel: '',
    rollNumber: '',
    exitReason: emptyLoc(),
    gradeId: '',
    currentGradeId: '',
    previousGradeId: '',
    previousSchool: emptyLoc(),
    degree: emptyLoc(),
    previousGradeText: emptyLoc(),
    enrollmentDate: '',
    exitDate: '',
    guardian: { name: emptyLoc(), relation: emptyLoc(), phone: '', address: emptyLoc() },
    guardians: [],
    previousSchools: [],
    lessonTrack: [],
    __gDraft: undefined,
    __psDraft: undefined,
    __ltDraft: undefined,
  }
}

/** Map API student document → form state for edit */
export function mapStudentRecordToForm(s) {
  const guardians =
    Array.isArray(s.guardians) && s.guardians.length > 0
      ? s.guardians.map((g) => ({
          name: g.name || emptyLoc(),
          relation: normalizeRelation(g.relation),
          profession: g.profession || '',
          phone: g.phone || '',
          idCard: g.idCard || '',
          address: g.address || emptyLoc(),
        }))
      : s.guardian?.name?.ur || s.guardian?.name?.en
        ? [
            {
              name: s.guardian.name || emptyLoc(),
              relation: normalizeRelation(s.guardian.relation),
              profession: '',
              phone: s.guardian.phone || '',
              idCard: '',
              address: s.guardian.address || emptyLoc(),
            },
          ]
        : []

  return {
    ...defaultForm(),
    sessionId: s.sessionId?._id || s.sessionId || '',
    studentId: s.studentId,
    photoUrl: s.photoUrl && !String(s.photoUrl).startsWith('blob:') ? s.photoUrl : '',
    name: s.name || emptyLoc(),
    darjahId: s.darjahId?._id || s.darjahId || '',
    subjectId: s.subjectId?._id || s.subjectId || '',
    bookId: s.bookId?._id || s.bookId || '',
    bookIds: Array.isArray(s.bookIds)
      ? s.bookIds.map((b) => (typeof b === 'object' ? b._id : b)).filter(Boolean)
      : s.bookId
        ? [s.bookId?._id || s.bookId]
        : [],
    teacherId: s.teacherId?._id || s.teacherId || '',
    fatherName: s.fatherName || emptyLoc(),
    gender: s.gender || '',
    idCard: s.idCard || '',
    dateOfBirth: toInputDate(s.dateOfBirth),
    phone: s.phone || '',
    city: s.city || '',
    country: s.country || emptyLoc(),
    state: s.state || emptyLoc(),
    cityLoc: s.cityLoc || emptyLoc(),
    districtCurrent: s.districtCurrent || emptyLoc(),
    districtPermanent: s.districtPermanent || emptyLoc(),
    addressCurrent: s.addressCurrent || emptyLoc(),
    addressPermanent: s.addressPermanent || emptyLoc(),
    classTypeLabel: s.classTypeLabel || '',
    rollNumber: s.rollNumber || '',
    exitReason: s.exitReason || emptyLoc(),
    gradeId: s.gradeId?._id || s.gradeId || '',
    currentGradeId: s.currentGradeId?._id || s.currentGradeId || '',
    previousGradeId: s.previousGradeId?._id || s.previousGradeId || '',
    previousSchool: s.previousSchool || emptyLoc(),
    degree: s.degree || emptyLoc(),
    previousGradeText: s.previousGradeText || emptyLoc(),
    enrollmentDate: toInputDate(s.enrollmentDate),
    exitDate: toInputDate(s.exitDate),
    guardian: {
      name: s.guardian?.name || emptyLoc(),
      relation: normalizeRelation(s.guardian?.relation),
      phone: s.guardian?.phone || '',
      address: s.guardian?.address || emptyLoc(),
    },
    guardians,
    previousSchools: Array.isArray(s.previousSchools) ? s.previousSchools : [],
    lessonTrack: (s.lessonTrack || []).map((lt) => ({
      para: lt.para,
      startDate: toInputDate(lt.startDate),
      endDate: toInputDate(lt.endDate),
    })),
  }
}

export function buildPayload(form) {
  const {
    __gDraft,
    __psDraft,
    __ltDraft,
    rollNumber,
    dateOfBirth,
    enrollmentDate,
    exitDate,
    lessonTrack,
    photoUrl: _photoUrl,
    ...rest
  } = form

  return {
    ...rest,
    sessionId: rest.sessionId || null,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : null,
    exitDate: exitDate ? new Date(exitDate) : null,
    lessonTrack: (lessonTrack || []).map((lt) => ({
      para: lt.para,
      startDate: lt.startDate ? new Date(lt.startDate) : null,
      endDate: lt.endDate ? new Date(lt.endDate) : null,
    })),
  }
}
