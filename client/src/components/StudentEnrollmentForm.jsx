import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { loc, flText, uiLang } from '../shared/localized'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import { FL } from '../shared/fieldLabels'
import { QURAN_PARAS, paraLabel } from '../shared/quranParas'
import { GUARDIAN_RELATIONS_STATIC } from '../shared/guardianRelationsStatic'
import {
  useGetDarajatQuery,
  useGetSubjectsQuery,
  useGetSubjectBooksQuery,
  useGetTeachersQuery,
  useGetGeoCountriesQuery,
  useGetGeoStatesQuery,
  useGetGeoCitiesQuery,
  useGetNextStudentIdQuery,
} from '../services/api'
import {
  PAKISTAN_PROVINCE_KEYS,
  citiesForProvinceKey,
  cityLocFromUrduName,
  matchProvinceKeyFromFormState,
  provinceEn,
  provinceUrDisplay,
} from '../shared/pakistanGeoUrdu.js'
import AppDateInput from './AppDateInput'
import { FlSectionTitle } from './BilingualLabel'
import { AppInput, AppSelect, AppTextarea, FormField, FormRow, AppFileInput } from './ui'
import { absoluteAssetUrl } from '../shared/assetUrl'

const emptyLoc = () => ({ ur: '', en: '' })

const emptyGuardian = () => ({
  name: emptyLoc(),
  relation: emptyLoc(),
  profession: '',
  phone: '',
  idCard: '',
  address: emptyLoc(),
})

const emptyPrevSchool = () => ({
  year: '',
  grade: '',
  institute: '',
  marks: '',
  result: '',
})

const TABS = [
  { id: 'basic', k: 'tabStudentBasic' },
  { id: 'guardian', k: 'tabStudentGuardian' },
  { id: 'previous', k: 'tabStudentPrevious' },
  { id: 'class', k: 'tabStudentClass' },
  { id: 'lesson', k: 'tabStudentLesson' },
]

function legacyGuardianFromList(list) {
  const g = list[0]
  if (!g) {
    return { name: emptyLoc(), relation: emptyLoc(), phone: '', address: emptyLoc() }
  }
  return {
    name: g.name || emptyLoc(),
    relation: g.relation || emptyLoc(),
    phone: g.phone || '',
    address: g.address || emptyLoc(),
  }
}

export default function StudentEnrollmentForm({
  isNew = false,
  form,
  setForm,
  grades,
  sessions = [],
  settings,
  lng,
  activeTab,
  setActiveTab,
  fileRef,
  videoRef,
  camOn,
  startCam,
  captureCam,
  onPhotoFileChange,
  fieldErrors = {},
  onBlurField,
  onClearError,
}) {
  const { t } = useTranslation()
  const { mode } = useCalendarMode()
  const lang = uiLang(lng)

  const countries = Array.isArray(settings?.countries) ? settings.countries : []
  const districts = Array.isArray(settings?.districts) ? settings.districts : []
  const relations = GUARDIAN_RELATIONS_STATIC
  const withdrawalReasons = Array.isArray(settings?.withdrawalReasons) ? settings.withdrawalReasons : []

  const { data: geoCountries = [] } = useGetGeoCountriesQuery()

  // Tartibat bindings for new student flow
  const { data: darajat = [] } = useGetDarajatQuery(form.sessionId ? { sessionId: form.sessionId } : undefined, {
    skip: !form.sessionId,
  })
  const { data: subjects = [] } = useGetSubjectsQuery(form.sessionId ? { sessionId: form.sessionId } : undefined, {
    skip: !form.sessionId,
  })
  const { data: teachers = [] } = useGetTeachersQuery()
  const { data: books = [] } = useGetSubjectBooksQuery(
    form.subjectId && form.darjahId ? { subjectId: form.subjectId, darjahId: form.darjahId } : undefined,
    { skip: !form.subjectId || !form.darjahId }
  )

  const darjahOptions = useMemo(() => {
    if (!form.subjectId) return []
    const sid = String(form.subjectId)
    return darajat.filter((d) => {
      if (!d?._id) return false
      return (d.subjectIds || []).some((s) => String(s._id || s) === sid)
    })
  }, [darajat, form.subjectId])

  const subjectOptions = useMemo(() => subjects.filter((s) => s && s._id), [subjects])

  const selectedDarjah = useMemo(
    () => darjahOptions.find((d) => String(d._id) === String(form.darjahId || '')) || null,
    [darjahOptions, form.darjahId]
  )

  const teacherOptions = useMemo(() => {
    if (!selectedDarjah || !form.subjectId) return []
    const rows = Array.isArray(selectedDarjah.assignments) ? selectedDarjah.assignments : []
    const ids = rows
      .filter((a) => String(a?.subjectId?._id || a?.subjectId || '') === String(form.subjectId))
      .map((a) => String(a?.teacherId?._id || a?.teacherId || ''))
      .filter(Boolean)
    const unique = [...new Set(ids)]
    return unique
      .map((id) => teachers.find((t) => String(t._id) === String(id)))
      .filter(Boolean)
  }, [selectedDarjah, form.subjectId, teachers])

  // If current teacherId is not assigned for this subject, clear it.
  useEffect(() => {
    if (!form.teacherId) return
    if (!selectedDarjah || !form.subjectId) return
    const allowed = new Set(teacherOptions.map((t) => String(t._id)))
    if (!allowed.has(String(form.teacherId))) {
      setForm((prev) => ({ ...prev, teacherId: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDarjah?._id, form.subjectId, teacherOptions.length])

  // If Darjah has an assignment for selected subject, auto-fill teacher.
  useEffect(() => {
    if (!selectedDarjah) return
    if (!form.subjectId) return
    const rows = Array.isArray(selectedDarjah.assignments) ? selectedDarjah.assignments : []
    const hit =
      rows.find((a) => String(a?.subjectId?._id || a?.subjectId || '') === String(form.subjectId)) || null
    if (!hit) return
    const teacherId = hit.teacherId?._id || hit.teacherId || ''
    if (!teacherId) return
    setForm((prev) => ({
      ...prev,
      teacherId: prev.teacherId || teacherId || '',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDarjah?._id, form.subjectId])

  // Auto-assign every book linked to the selected subject + darjah.
  const classBookIdsKey = books.map((b) => String(b._id)).join(',')
  useEffect(() => {
    if (!form.subjectId || !form.darjahId) return
    const ids = classBookIdsKey ? classBookIdsKey.split(',') : []
    setForm((prev) => {
      const prevIds = (prev.bookIds || []).map(String)
      const same =
        prevIds.length === ids.length &&
        prevIds.every((id, i) => id === ids[i]) &&
        String(prev.bookId || '') === String(ids[0] || '')
      if (same) return prev
      return {
        ...prev,
        bookIds: ids,
        bookId: ids[0] || '',
      }
    })
  }, [form.subjectId, form.darjahId, classBookIdsKey])

  const { data: nextStudent } = useGetNextStudentIdQuery(
    form.sessionId ? { sessionId: form.sessionId } : undefined,
    { skip: !form.sessionId }
  )

  // Auto-fill Student ID when session is selected (new student only)
  useEffect(() => {
    if (!isNew) return
    if (!form.sessionId) return
    if (form.studentId) return
    const sid = nextStudent?.studentId ? String(nextStudent.studentId) : ''
    if (!sid) return
    setForm((prev) => (prev.studentId ? prev : { ...prev, studentId: sid }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextStudent?.studentId, form.sessionId])

  // Auto-select first class/darjah for new student (so teacher binds immediately)
  useEffect(() => {
    if (!isNew) return
    if (!form.sessionId) return
    if (form.currentGradeId) return
    if (!Array.isArray(grades) || grades.length === 0) return
    const first = grades.find((g) => g && g._id) || null
    if (!first?._id) return
    setForm((prev) =>
      prev.currentGradeId
        ? prev
        : {
            ...prev,
            currentGradeId: first._id,
            gradeId: first._id,
          }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, form.sessionId, grades])

  // Default country = Pakistan (but user can change). Functional update so parent resets don't leave stale guards.
  useEffect(() => {
    if (!geoCountries?.length) return
    setForm((prev) => {
      if (prev.country?.ur || prev.country?.en) return prev
      const pk = geoCountries.find((x) => x.code === 'PK')
      if (!pk?.name) return prev
      return {
        ...prev,
        country: { ur: pk.name.ur || '', en: pk.name.en || '' },
        state: emptyLoc(),
        cityLoc: emptyLoc(),
        city: '',
      }
    })
  }, [geoCountries])
  const countryCode = useMemo(() => {
    const c = form.country || {}
    const row = geoCountries.find((x) => (x.name?.ur || '') === (c.ur || '') && (x.name?.en || '') === (c.en || ''))
    return row?.code || ''
  }, [geoCountries, form.country])
  const selectedGeoCountry = useMemo(() => {
    const c = form.country || {}
    return geoCountries.find((x) => (x.name?.ur || '') === (c.ur || '') && (x.name?.en || '') === (c.en || '')) || null
  }, [geoCountries, form.country])

  const usePakistanStatic = countryCode === 'PK'
  const pkProvinceKey = useMemo(() => (usePakistanStatic ? matchProvinceKeyFromFormState(form.state) : null), [usePakistanStatic, form.state])
  const pkCities = useMemo(() => (pkProvinceKey ? citiesForProvinceKey(pkProvinceKey) : []), [pkProvinceKey])

  const { data: geoStates = [] } = useGetGeoStatesQuery(countryCode ? { country: countryCode } : undefined, {
    skip: !countryCode || usePakistanStatic,
  })
  const selectedGeoState = useMemo(() => {
    const s = form.state || {}
    return geoStates.find((x) => (x.name?.ur || '') === (s.ur || '') && (x.name?.en || '') === (s.en || '')) || null
  }, [geoStates, form.state])
  const stateCode = selectedGeoState?.code || ''
  const { data: geoCities = [] } = useGetGeoCitiesQuery(
    countryCode && stateCode ? { country: countryCode, state: stateCode } : undefined,
    { skip: !countryCode || !stateCode || usePakistanStatic }
  )

  const currentGrade = useMemo(
    () => grades.find((g) => g._id === form.currentGradeId),
    [grades, form.currentGradeId]
  )
  const teacher = currentGrade?.responsibleTeacherId
  const teacherName = teacher ? loc(teacher.name, lng) : '—'

  function setCountryByIndex(i) {
    if (i === '' || i == null) {
      const pk = geoCountries.find((x) => x.code === 'PK')
      setForm({
        ...form,
        country: pk?.name ? { ur: pk.name.ur || '', en: pk.name.en || '' } : emptyLoc(),
        state: emptyLoc(),
        cityLoc: emptyLoc(),
        city: '',
      })
      return
    }
    const row = geoCountries[Number(i)]
    setForm({
      ...form,
      country: row?.name ? { ur: row.name.ur || '', en: row.name.en || '' } : emptyLoc(),
      state: emptyLoc(),
      cityLoc: emptyLoc(),
      city: '',
    })
  }

  function setStateByIndex(i) {
    if (i === '' || i == null) {
      setForm({ ...form, state: emptyLoc(), cityLoc: emptyLoc(), city: '' })
      return
    }
    if (usePakistanStatic) {
      const key = PAKISTAN_PROVINCE_KEYS[Number(i)]
      if (!key) {
        setForm({ ...form, state: emptyLoc(), cityLoc: emptyLoc(), city: '' })
        return
      }
      setForm({
        ...form,
        state: { ur: provinceUrDisplay(key), en: provinceEn(key) },
        cityLoc: emptyLoc(),
        city: '',
      })
      return
    }
    const row = geoStates[Number(i)]
    setForm({
      ...form,
      state: row?.name ? { ur: row.name.ur || '', en: row.name.en || '' } : emptyLoc(),
      cityLoc: emptyLoc(),
      city: '',
    })
  }

  function setCityByIndex(i) {
    if (i === '' || i == null) {
      setForm({ ...form, cityLoc: emptyLoc(), city: '' })
      return
    }
    if (usePakistanStatic && pkProvinceKey) {
      const name = pkCities[Number(i)]
      const cityLoc = name ? cityLocFromUrduName(name) : emptyLoc()
      const legacyCity = cityLoc.en || cityLoc.ur || ''
      setForm({ ...form, cityLoc, city: legacyCity })
      return
    }
    const row = geoCities[Number(i)]
    const cityLoc = row?.name ? { ur: row.name.ur || '', en: row.name.en || '' } : emptyLoc()
    const legacyCity = cityLoc.en || cityLoc.ur || ''
    setForm({ ...form, cityLoc, city: legacyCity })
  }

  function setDistrictByIndex(field, list, i) {
    if (i === '' || i == null) {
      setForm({ ...form, [field]: emptyLoc() })
      return
    }
    if (usePakistanStatic && pkProvinceKey) {
      const name = pkCities[Number(i)]
      setForm({ ...form, [field]: name ? cityLocFromUrduName(name) : emptyLoc() })
      return
    }
    const row = list[Number(i)]
    setForm({ ...form, [field]: row ? { ur: row.ur || '', en: row.en || '' } : emptyLoc() })
  }

  function countryIndex() {
    if (!form.country?.ur && !form.country?.en) return ''
    const i = geoCountries.findIndex(
      (c) =>
        (c.name?.ur || '') === (form.country?.ur || '') && (c.name?.en || '') === (form.country?.en || '')
    )
    return i >= 0 ? String(i) : ''
  }

  function stateIndex() {
    if (!form.state?.ur && !form.state?.en) return ''
    if (usePakistanStatic) {
      const k = matchProvinceKeyFromFormState(form.state)
      if (!k) return ''
      const i = PAKISTAN_PROVINCE_KEYS.indexOf(k)
      return i >= 0 ? String(i) : ''
    }
    const i = geoStates.findIndex(
      (c) =>
        (c.name?.ur || '') === (form.state?.ur || '') && (c.name?.en || '') === (form.state?.en || '')
    )
    return i >= 0 ? String(i) : ''
  }

  function cityIndex() {
    if (!form.cityLoc?.ur && !form.cityLoc?.en) return ''
    if (usePakistanStatic && pkProvinceKey) {
      const ur = (form.cityLoc?.ur || '').trim()
      const i = pkCities.findIndex((n) => n === ur || n === (form.cityLoc?.en || '').trim())
      return i >= 0 ? String(i) : ''
    }
    const i = geoCities.findIndex(
      (c) =>
        (c.name?.ur || '') === (form.cityLoc?.ur || '') && (c.name?.en || '') === (form.cityLoc?.en || '')
    )
    return i >= 0 ? String(i) : ''
  }

  function districtIndex(val) {
    if (!val?.ur && !val?.en) return ''
    if (usePakistanStatic && pkProvinceKey) {
      const ur = (val?.ur || '').trim()
      const i = pkCities.findIndex((n) => n === ur || n === (val?.en || '').trim())
      return i >= 0 ? String(i) : ''
    }
    const i = districts.findIndex(
      (c) => (c.ur || '') === (val?.ur || '') && (c.en || '') === (val?.en || '')
    )
    return i >= 0 ? String(i) : ''
  }

  function exitReasonIndex() {
    const ex = form.exitReason
    if (!ex?.ur && !ex?.en) return ''
    const i = withdrawalReasons.findIndex(
      (w) =>
        (w.name?.ur || '') === (ex?.ur || '') && (w.name?.en || '') === (ex?.en || '')
    )
    return i >= 0 ? String(i) : ''
  }

  const guardians = Array.isArray(form.guardians) ? form.guardians : []
  const previousSchools = Array.isArray(form.previousSchools) ? form.previousSchools : []
  const lessonTrack = Array.isArray(form.lessonTrack) ? form.lessonTrack : []

  const draft = form.__psDraft || emptyPrevSchool()

  return (
    <div className="student-enrollment-form">
      <ul className="nav nav-tabs flex-wrap mb-3" role="tablist">
        {TABS.map((tab) => (
          <li key={tab.id} className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={`bilingual-label__text--${lang}`} lang={lang}>
                {flText(FL[tab.k], lng)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'basic' && (
        <FormRow>
          <div className="app-form-col app-form-col--12">
            <FlSectionTitle k="photo" />
            <div className="student-photo-card">
              <div className="student-photo-card__preview">
                {form.photoUrl ? (
                  <img
                    src={absoluteAssetUrl(form.photoUrl)}
                    alt=""
                    className="student-photo-card__img"
                  />
                ) : (
                  <div className="student-photo-card__empty">
                    {lng === 'ur' ? 'تصویر' : 'Photo'}
                  </div>
                )}
              </div>
              <div className="student-photo-card__actions">
                <p className="student-photo-card__hint mb-2">
                  {lng === 'ur'
                    ? 'فائل منتخب کریں یا کیمرہ سے تصویر لیں'
                    : 'Choose a file or capture with camera'}
                </p>
                <AppFileInput
                  id="f-photo"
                  ref={fileRef}
                  accept="image/*"
                  variant="dropzone"
                  optionalLabel={false}
                  label={
                    lng === 'ur'
                      ? 'تصویر منتخب کریں یا یہاں کھینچ کر چھوڑیں'
                      : 'Choose a photo or drag and drop here'
                  }
                  hint={lng === 'ur' ? 'JPG, PNG — زیادہ سے زیادہ 5MB' : 'JPG, PNG — max 5MB'}
                  onChange={onPhotoFileChange}
                />
                <div className="student-photo-card__buttons mt-2">
                  {!camOn ? (
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={startCam}>
                      {t('student.camera')}
                    </button>
                  ) : (
                    <>
                      <video ref={videoRef} className="student-photo-card__video" playsInline muted />
                      <button type="button" className="btn btn-sm btn-primary" onClick={captureCam}>
                        {t('student.capture')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <FormField
            k="studentId"
            htmlFor="f-studentId"
            col={4}
            required
            hint={lng === 'ur' ? 'خودکار' : 'Auto'}
          >
            <AppInput id="f-studentId" latin required value={form.studentId} readOnly />
          </FormField>
          <FormField k="sessionTitle" htmlFor="f-session" col={4}>
            <AppSelect
              id="f-session"
              value={form.sessionId || ''}
              onChange={(e) => {
                const sid = e.target.value
                setForm({
                  ...form,
                  sessionId: sid,
                  studentId: '',
                  gradeId: '',
                  currentGradeId: '',
                  previousGradeId: '',
                })
              }}
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
              lang={lang}
              style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : undefined }}
            >
              <option value="">—</option>
              {sessions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                </option>
              ))}
            </AppSelect>
          </FormField>
          <FormField k="gender" htmlFor="f-gender" col={4}>
            <AppSelect
              id="f-gender"
              value={form.gender || ''}
              onValueChange={(v) => setForm({ ...form, gender: v })}
            >
              <option value="">—</option>
              <option value="male">{lng === 'ur' ? 'مرد' : 'Male'}</option>
              <option value="female">{lng === 'ur' ? 'عورت' : 'Female'}</option>
            </AppSelect>
          </FormField>

          <FormField
            k="nameUrField"
            htmlFor="f-name-ur"
            col={4}
            langField="ur"
            required
            error={fieldErrors['name.ur']}
          >
            <AppInput
              id="f-name-ur"
              data-lang-field="ur"
              data-field="name.ur"
              value={form.name.ur}
              onChange={(e) => setForm({ ...form, name: { ...form.name, ur: e.target.value } })}
              onBlur={() => onBlurField?.('name.ur')}
            />
          </FormField>
          <FormField k="nameEnField" htmlFor="f-name-en" col={4} langField="en">
            <AppInput
              id="f-name-en"
              data-lang-field="en"
              value={form.name.en}
              onChange={(e) => {
                setForm({ ...form, name: { ...form.name, en: e.target.value } })
                onClearError?.('name.ur')
              }}
            />
          </FormField>
          <FormField k="fatherUr" htmlFor="f-father-ur" col={4} langField="ur">
            <AppInput
              id="f-father-ur"
              data-lang-field="ur"
              value={form.fatherName.ur}
              onChange={(e) =>
                setForm({ ...form, fatherName: { ...form.fatherName, ur: e.target.value } })
              }
            />
          </FormField>
          <FormField k="fatherEn" htmlFor="f-father-en" col={4} langField="en">
            <AppInput
              id="f-father-en"
              data-lang-field="en"
              value={form.fatherName.en}
              onChange={(e) =>
                setForm({ ...form, fatherName: { ...form.fatherName, en: e.target.value } })
              }
            />
          </FormField>
          <FormField k="phone" htmlFor="f-phone" col={4} error={fieldErrors.phone}>
            <AppInput
              id="f-phone"
              latin
              data-field="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              onBlur={() => onBlurField?.('phone')}
            />
          </FormField>
          <FormField k="idCard" htmlFor="f-id" col={4} error={fieldErrors.idCard}>
            <AppInput
              id="f-id"
              latin
              data-field="idCard"
              value={form.idCard || ''}
              onChange={(e) => setForm({ ...form, idCard: e.target.value })}
              onBlur={() => onBlurField?.('idCard')}
            />
          </FormField>
          <FormField k="dateOfBirth" htmlFor="f-dob" col={4} error={fieldErrors.dateOfBirth}>
            <AppDateInput
              id="f-dob"
              lng={lng}
              value={form.dateOfBirth || ''}
              onChange={(v) => setForm({ ...form, dateOfBirth: v })}
              onBlur={() => onBlurField?.('dateOfBirth')}
              emptyCalendarYear={1990}
            />
          </FormField>
          <FormField k="enrollmentDate" htmlFor="f-enroll" col={4}>
            <AppDateInput
              id="f-enroll"
              lng={lng}
              value={form.enrollmentDate}
              onChange={(v) => setForm({ ...form, enrollmentDate: v })}
            />
          </FormField>
          <div className="app-form-col app-form-col--12">
            <FlSectionTitle k="addressInfoSection" className="mb-1" />
          </div>
          <FormField k="studentCountry" htmlFor="f-country" col={4}>
            <AppSelect
              id="f-country"
              value={countryIndex()}
              onValueChange={(v) => setCountryByIndex(v)}
            >
              <option value="">—</option>
              {geoCountries.map((c, i) => (
                <option key={i} value={String(i)}>
                  {loc(c.name, lng)}
                </option>
              ))}
            </AppSelect>
          </FormField>
          <FormField k="state" htmlFor="f-state" col={4}>
            <AppSelect
              id="f-state"
              value={stateIndex()}
              onValueChange={(v) => setStateByIndex(v)}
              disabled={!selectedGeoCountry}
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
              lang={lang}
              style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : undefined }}
            >
              <option value="">—</option>
              {usePakistanStatic
                ? PAKISTAN_PROVINCE_KEYS.map((key, i) => (
                    <option key={key} value={String(i)}>
                      {provinceUrDisplay(key)}
                    </option>
                  ))
                : geoStates.map((s, i) => (
                    <option key={i} value={String(i)}>
                      {loc(s.name, lng)}
                    </option>
                  ))}
            </AppSelect>
          </FormField>
          <FormField k="city" htmlFor="f-city" col={4}>
            <AppSelect
              id="f-city"
              value={cityIndex()}
              onValueChange={(v) => setCityByIndex(v)}
              disabled={usePakistanStatic ? !pkProvinceKey : !selectedGeoState}
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
              lang={lang}
              style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : undefined }}
            >
              <option value="">—</option>
              {usePakistanStatic
                ? pkCities.map((name, i) => (
                    <option key={`${name}-${i}`} value={String(i)}>
                      {name}
                    </option>
                  ))
                : geoCities.map((c, i) => (
                    <option key={i} value={String(i)}>
                      {loc(c.name, lng)}
                    </option>
                  ))}
            </AppSelect>
          </FormField>
          <FormField k="studentDistrictCurrent" htmlFor="f-dc" col={4}>
            <AppSelect
              id="f-dc"
              value={districtIndex(form.districtCurrent)}
              onValueChange={(v) =>
                setDistrictByIndex('districtCurrent', usePakistanStatic ? pkCities : districts, v)
              }
              disabled={usePakistanStatic ? !pkProvinceKey : false}
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
              lang={lang}
              style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : undefined }}
            >
              <option value="">—</option>
              {(usePakistanStatic ? pkCities : districts).map((c, i) => (
                <option key={usePakistanStatic ? `${c}-${i}` : i} value={String(i)}>
                  {usePakistanStatic ? c : loc(c, lng)}
                </option>
              ))}
            </AppSelect>
          </FormField>
          <FormField k="studentAddressCurrent" htmlFor="f-ac" col={8}>
            <AppInput
              id="f-ac"
              value={form.addressCurrent?.ur || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  addressCurrent: {
                    ur: e.target.value,
                    en: form.addressCurrent?.en || '',
                  },
                })
              }
              dir="rtl"
            />
          </FormField>
          <FormField k="studentDistrictPermanent" htmlFor="f-dp" col={4}>
            <AppSelect
              id="f-dp"
              value={districtIndex(form.districtPermanent)}
              onValueChange={(v) =>
                setDistrictByIndex('districtPermanent', usePakistanStatic ? pkCities : districts, v)
              }
              disabled={usePakistanStatic ? !pkProvinceKey : false}
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
              lang={lang}
              style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : undefined }}
            >
              <option value="">—</option>
              {(usePakistanStatic ? pkCities : districts).map((c, i) => (
                <option key={usePakistanStatic ? `${c}-${i}` : i} value={String(i)}>
                  {usePakistanStatic ? c : loc(c, lng)}
                </option>
              ))}
            </AppSelect>
          </FormField>
          <FormField k="studentAddressPermanent" htmlFor="f-ap" col={8}>
            <AppInput
              id="f-ap"
              value={form.addressPermanent?.ur || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  addressPermanent: {
                    ur: e.target.value,
                    en: form.addressPermanent?.en || '',
                  },
                })
              }
              dir="rtl"
            />
          </FormField>
          <input type="hidden" value={form.city || ''} readOnly aria-hidden />
          <FormField k="exitDate" htmlFor="f-exit" col={4}>
            <AppDateInput
              id="f-exit"
              lng={lng}
              value={form.exitDate}
              onChange={(v) => setForm({ ...form, exitDate: v })}
            />
          </FormField>
          <FormField k="exitReasonField" htmlFor="f-exr" col={8}>
            <AppSelect
              id="f-exr"
              value={exitReasonIndex()}
              onValueChange={(i) => {
                if (i === '') {
                  setForm({ ...form, exitReason: emptyLoc() })
                  return
                }
                const row = withdrawalReasons[Number(i)]
                const name = row?.name
                  ? { ur: row.name.ur || '', en: row.name.en || '' }
                  : emptyLoc()
                setForm({ ...form, exitReason: name })
              }}
            >
              <option value="">—</option>
              {withdrawalReasons.map((w, i) => (
                <option key={i} value={String(i)}>
                  {loc(w.name, lng)}
                </option>
              ))}
            </AppSelect>
          </FormField>
        </FormRow>
      )}

      {activeTab === 'guardian' && (
        <div>
          <FormRow className="align-items-end mb-2">
            <FormField k="guardianNameUr" htmlFor="g-nu" col={4} langField="ur">
              <AppInput
                id="g-nu"
                value={form.__gDraft?.name?.ur || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    __gDraft: {
                      ...(form.__gDraft || emptyGuardian()),
                      name: { ...(form.__gDraft?.name || emptyLoc()), ur: e.target.value },
                    },
                  })
                }
                data-lang-field="ur"
              />
            </FormField>
            <FormField k="guardianNameEn" htmlFor="g-ne" col={4} langField="en">
              <AppInput
                id="g-ne"
                value={form.__gDraft?.name?.en || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    __gDraft: {
                      ...(form.__gDraft || emptyGuardian()),
                      name: { ...(form.__gDraft?.name || emptyLoc()), en: e.target.value },
                    },
                  })
                }
                data-lang-field="en"
              />
            </FormField>
            <FormField k="relationField" htmlFor="g-rel" col={4}>
              <AppSelect
                id="g-rel"
                value={form.__gDraft?.relIdx ?? ''}
                onValueChange={(i) => {
                  const row = i === '' ? null : relations[Number(i)]
                  setForm({
                    ...form,
                    __gDraft: {
                      ...(form.__gDraft || emptyGuardian()),
                      relIdx: i,
                      relation: row ? { ur: row.ur || '', en: row.en || '' } : emptyLoc(),
                    },
                  })
                }}
              >
                <option value="">—</option>
                {relations.map((r, i) => (
                  <option key={i} value={String(i)}>
                    {loc(r, lng)}
                  </option>
                ))}
              </AppSelect>
            </FormField>
            <FormField k="profession" htmlFor="g-pr" col={4}>
              <AppInput
                id="g-pr"
                value={form.__gDraft?.profession || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    __gDraft: { ...(form.__gDraft || emptyGuardian()), profession: e.target.value },
                  })
                }
              />
            </FormField>
            <FormField k="phone" htmlFor="g-ph" col={4}>
              <AppInput
                id="g-ph"
                value={form.__gDraft?.phone || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    __gDraft: { ...(form.__gDraft || emptyGuardian()), phone: e.target.value },
                  })
                }
              />
            </FormField>
            <div className="app-form-col app-form-col--4 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-sm btn-success w-100"
                onClick={() => {
                  const raw = { ...(form.__gDraft || emptyGuardian()) }
                  const d = {
                    name: raw.name || emptyLoc(),
                    relation: raw.relation || emptyLoc(),
                    profession: raw.profession || '',
                    phone: raw.phone || '',
                    idCard: raw.idCard || '',
                    address: raw.address || emptyLoc(),
                  }
                  if (!d.name?.ur?.trim() && !d.name?.en?.trim()) return
                  const next = [...guardians, d]
                  setForm({
                    ...form,
                    guardians: next,
                    __gDraft: emptyGuardian(),
                    guardian: legacyGuardianFromList(next),
                  })
                }}
              >
                {flText(FL.add, lng)}
              </button>
            </div>
          </FormRow>
          <div className="data-table-shell content-panel overflow-hidden mt-2">
            <div className="table-responsive">
              <table className="table data-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="data-table__th">{flText(FL.guardianTableTitle, lng)}</th>
                    <th className="data-table__th">{flText(FL.relationField, lng)}</th>
                    <th className="data-table__th">{flText(FL.profession, lng)}</th>
                    <th className="data-table__th">{flText(FL.phone, lng)}</th>
                    <th className="data-table__th no-print">{flText(FL.actions, lng)}</th>
                  </tr>
                </thead>
                <tbody>
                  {guardians.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="data-table__empty">
                        —
                      </td>
                    </tr>
                  ) : (
                    guardians.map((g, idx) => (
                      <tr key={idx} className="data-table__row">
                        <td className="data-table__td">{loc(g.name, lng)}</td>
                        <td className="data-table__td">{loc(g.relation, lng)}</td>
                        <td className="data-table__td">{g.profession || '—'}</td>
                        <td className="data-table__td data-table__td--num" dir="ltr">
                          {g.phone || '—'}
                        </td>
                        <td className="data-table__td no-print">
                          <div className="data-table__actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                const next = guardians.filter((_, j) => j !== idx)
                                setForm({
                                  ...form,
                                  guardians: next,
                                  guardian: legacyGuardianFromList(next),
                                })
                              }}
                            >
                              {flText(FL.delete, lng)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'previous' && (
        <div>
          <FormRow className="mb-2 align-items-end">
            <FormField k="previousSchoolYear" htmlFor="ps-y" col={4}>
              <AppInput
                id="ps-y"
                value={draft.year}
                onChange={(e) =>
                  setForm({ ...form, __psDraft: { ...draft, year: e.target.value } })
                }
              />
            </FormField>
            <FormField k="previousSchoolGrade" htmlFor="ps-g" col={4}>
              <AppInput
                id="ps-g"
                value={draft.grade}
                onChange={(e) =>
                  setForm({ ...form, __psDraft: { ...draft, grade: e.target.value } })
                }
              />
            </FormField>
            <FormField k="previousSchoolInstitute" htmlFor="ps-i" col={4}>
              <AppInput
                id="ps-i"
                value={draft.institute}
                onChange={(e) =>
                  setForm({ ...form, __psDraft: { ...draft, institute: e.target.value } })
                }
              />
            </FormField>
            <FormField k="previousSchoolMarks" htmlFor="ps-m" col={4}>
              <AppInput
                id="ps-m"
                value={draft.marks}
                onChange={(e) =>
                  setForm({ ...form, __psDraft: { ...draft, marks: e.target.value } })
                }
              />
            </FormField>
            <FormField k="previousSchoolResult" htmlFor="ps-r" col={4}>
              <AppInput
                id="ps-r"
                value={draft.result}
                onChange={(e) =>
                  setForm({ ...form, __psDraft: { ...draft, result: e.target.value } })
                }
              />
            </FormField>
            <div className="app-form-col app-form-col--4 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-sm btn-success w-100"
                onClick={() => {
                  const d = { ...draft }
                  if (!d.year && !d.institute) return
                  setForm({
                    ...form,
                    previousSchools: [...previousSchools, d],
                    __psDraft: emptyPrevSchool(),
                  })
                }}
              >
                {flText(FL.add, lng)}
              </button>
            </div>
          </FormRow>
          <div className="data-table-shell content-panel overflow-hidden mt-2">
            <div className="table-responsive">
              <table className="table data-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="data-table__th">{flText(FL.previousSchoolYear, lng)}</th>
                    <th className="data-table__th">{flText(FL.previousSchoolGrade, lng)}</th>
                    <th className="data-table__th">{flText(FL.previousSchoolInstitute, lng)}</th>
                    <th className="data-table__th">{flText(FL.previousSchoolMarks, lng)}</th>
                    <th className="data-table__th">{flText(FL.previousSchoolResult, lng)}</th>
                    <th className="data-table__th no-print">{flText(FL.actions, lng)}</th>
                  </tr>
                </thead>
                <tbody>
                  {previousSchools.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="data-table__empty">
                        —
                      </td>
                    </tr>
                  ) : (
                    previousSchools.map((row, idx) => (
                      <tr key={idx} className="data-table__row">
                        <td className="data-table__td" dir="ltr">
                          {row.year || '—'}
                        </td>
                        <td className="data-table__td">{row.grade || '—'}</td>
                        <td className="data-table__td">{row.institute || '—'}</td>
                        <td className="data-table__td data-table__td--num" dir="ltr">
                          {row.marks || '—'}
                        </td>
                        <td className="data-table__td">{row.result || '—'}</td>
                        <td className="data-table__td no-print">
                          <div className="data-table__actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  previousSchools: previousSchools.filter((_, j) => j !== idx),
                                })
                              }
                            >
                              {flText(FL.delete, lng)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'class' && (
        <FormRow>
          <FormField k="subjectName" htmlFor="f-subject" col={4} required>
            <AppSelect
              id="f-subject"
              required
              value={form.subjectId || ''}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  subjectId: v,
                  darjahId: '',
                  bookId: '',
                  bookIds: [],
                  teacherId: '',
                })
              }
            >
              <option value="">—</option>
              {subjectOptions.map((s) => (
                <option key={s._id} value={s._id}>
                  {loc(s.name, lng)}
                </option>
              ))}
            </AppSelect>
          </FormField>
          <FormField k="classGrade" htmlFor="f-darjah" col={4} required>
            <AppSelect
              id="f-darjah"
              required
              value={form.darjahId || ''}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  darjahId: v,
                  bookId: '',
                  bookIds: [],
                  teacherId: '',
                })
              }
              disabled={!form.subjectId}
            >
              <option value="">—</option>
              {darjahOptions.map((d) => (
                <option key={d._id} value={d._id}>
                  {loc(d.name, lng)} {d.code ? `— ${d.code}` : ''}
                </option>
              ))}
            </AppSelect>
          </FormField>
          <FormField k="teacherReadonly" htmlFor="f-teacher" col={4}>
            <AppSelect
              id="f-teacher"
              value={form.teacherId || ''}
              onValueChange={(v) => setForm({ ...form, teacherId: v })}
              disabled={!form.subjectId || !form.darjahId || teacherOptions.length === 0}
            >
              <option value="">—</option>
              {teacherOptions.map((tch) => (
                <option key={tch._id} value={tch._id}>
                  {loc(tch.name, lng)}
                </option>
              ))}
            </AppSelect>
          </FormField>
          <FormField k="bookTitle" htmlFor="f-books" col={12}>
            <p className="small text-secondary mb-2" lang={lang}>
              {lng === 'ur'
                ? 'اس درجہ کی تمام کتابیں خود بخود تفویض ہو جائیں گی'
                : 'All books for this class are assigned automatically'}
            </p>
            {!form.subjectId || !form.darjahId ? (
              <p className="small text-muted mb-0" lang={lang}>
                {lng === 'ur' ? 'پہلے شعبہ اور درجہ منتخب کریں' : 'Select subject and darjah first'}
              </p>
            ) : books.length === 0 ? (
              <p className="small text-muted mb-0">{lng === 'ur' ? 'کوئی کتاب نہیں' : 'No books'}</p>
            ) : (
              <ul className="mb-0 ps-3 small" id="f-books">
                {books.map((b) => (
                  <li key={b._id}>{loc(b.title, lng)}</li>
                ))}
              </ul>
            )}
          </FormField>
          <FormField k="classTypeField" htmlFor="f-ctype" col={4}>
            <AppInput
              id="f-ctype"
              value={form.classTypeLabel || ''}
              onChange={(e) => setForm({ ...form, classTypeLabel: e.target.value })}
            />
          </FormField>
          <FormField
            k="rollNumber"
            htmlFor="f-roll"
            col={4}
            hint={flText(FL.rollNumberHint, lng)}
          >
            <AppInput
              id="f-roll"
              readOnly
              latin
              className="bg-body-secondary"
              value={form.rollNumber || ''}
              placeholder={form.rollNumber ? '' : '—'}
              aria-readonly="true"
            />
          </FormField>
          <FormField k="enrollmentDate" htmlFor="f-ce" col={4}>
            <AppDateInput
              id="f-ce"
              lng={lng}
              value={form.enrollmentDate}
              onChange={(v) => setForm({ ...form, enrollmentDate: v })}
            />
          </FormField>
          <FormField k="exitDate" htmlFor="f-cx" col={4}>
            <AppDateInput
              id="f-cx"
              lng={lng}
              value={form.exitDate}
              onChange={(v) => setForm({ ...form, exitDate: v })}
            />
          </FormField>
          <FormField k="exitReasonField" htmlFor="f-cxr" col={8}>
            <AppSelect
              id="f-cxr"
              value={exitReasonIndex()}
              onValueChange={(i) => {
                if (i === '') {
                  setForm({ ...form, exitReason: emptyLoc() })
                  return
                }
                const row = withdrawalReasons[Number(i)]
                const name = row?.name
                  ? { ur: row.name.ur || '', en: row.name.en || '' }
                  : emptyLoc()
                setForm({ ...form, exitReason: name })
              }}
            >
              <option value="">—</option>
              {withdrawalReasons.map((w, i) => (
                <option key={i} value={String(i)}>
                  {loc(w.name, lng)}
                </option>
              ))}
            </AppSelect>
          </FormField>
        </FormRow>
      )}

      {activeTab === 'lesson' && (
        <div>
          <FormRow className="align-items-end mb-2">
            <FormField k="lessonPara" htmlFor="lt-para" col={4}>
              <AppSelect
                id="lt-para"
                value={form.__ltDraft?.para || ''}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    __ltDraft: {
                      ...(form.__ltDraft || {}),
                      para: v ? Number(v) : '',
                    },
                  })
                }
              >
                <option value="">—</option>
                {QURAN_PARAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {paraLabel(p.id, lng)}
                  </option>
                ))}
              </AppSelect>
            </FormField>
            <FormField k="lessonStart" htmlFor="lt-s" col={4}>
              <AppDateInput
                id="lt-s"
                lng={lng}
                value={form.__ltDraft?.startDate || ''}
                onChange={(v) =>
                  setForm({
                    ...form,
                    __ltDraft: { ...(form.__ltDraft || {}), startDate: v },
                  })
                }
              />
            </FormField>
            <FormField k="lessonComplete" htmlFor="lt-e" col={4}>
              <AppDateInput
                id="lt-e"
                lng={lng}
                value={form.__ltDraft?.endDate || ''}
                onChange={(v) =>
                  setForm({
                    ...form,
                    __ltDraft: { ...(form.__ltDraft || {}), endDate: v },
                  })
                }
              />
            </FormField>
            <div className="app-form-col app-form-col--4 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-sm btn-success w-100"
                onClick={() => {
                  const d = form.__ltDraft || {}
                  if (!d.para) return
                  setForm({
                    ...form,
                    lessonTrack: [
                      ...lessonTrack,
                      {
                        para: d.para,
                        startDate: d.startDate || null,
                        endDate: d.endDate || null,
                      },
                    ],
                    __ltDraft: { para: '', startDate: '', endDate: '' },
                  })
                }}
              >
                {flText(FL.add, lng)}
              </button>
            </div>
          </FormRow>
          <div className="data-table-shell content-panel overflow-hidden mt-2">
            <div className="table-responsive">
              <table className="table data-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="data-table__th">{flText(FL.lessonPara, lng)}</th>
                    <th className="data-table__th">{flText(FL.lessonStart, lng)}</th>
                    <th className="data-table__th">{flText(FL.lessonComplete, lng)}</th>
                    <th className="data-table__th no-print">{flText(FL.actions, lng)}</th>
                  </tr>
                </thead>
                <tbody>
                  {lessonTrack.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="data-table__empty">
                        —
                      </td>
                    </tr>
                  ) : (
                    lessonTrack.map((row, idx) => (
                      <tr key={idx} className="data-table__row">
                        <td className="data-table__td">{paraLabel(row.para, lng)}</td>
                        <td className="data-table__td" dir="ltr">
                          {formatDisplayDate(row.startDate, lng, mode) || '—'}
                        </td>
                        <td className="data-table__td" dir="ltr">
                          {formatDisplayDate(row.endDate, lng, mode) || '—'}
                        </td>
                        <td className="data-table__td no-print">
                          <div className="data-table__actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  lessonTrack: lessonTrack.filter((_, j) => j !== idx),
                                })
                              }
                            >
                              {flText(FL.delete, lng)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
