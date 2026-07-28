import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ConfirmActionModal from '../components/ConfirmActionModal'
import { useFlash } from '../app/flash.jsx'
import { useUnsavedChangesGuard } from '../shared/useUnsavedChangesGuard'
import {
  formatCnicDisplay,
  isValidCnic,
  isValidPhone,
  trimFormStrings,
} from '../shared/pkValidation'
import {
  useGetTeacherQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useGetSessionsQuery,
  useGetDarajatQuery,
  useGetSubjectsQuery,
  useGetSubjectBooksQuery,
  useGetGeoCountriesQuery,
  useGetGeoStatesQuery,
  useGetGeoCitiesQuery,
} from '../services/api'
import { flText, loc, uiLang } from '../shared/localized'
import { FL } from '../shared/fieldLabels'
import {
  PAKISTAN_PROVINCE_KEYS,
  citiesForProvinceKey,
  cityLocFromUrduName,
  matchProvinceKeyFromFormState,
  provinceEn,
  provinceUrDisplay,
} from '../shared/pakistanGeoUrdu.js'
import { FlSectionTitle } from '../components/BilingualLabel'
import AppDateInput from '../components/AppDateInput'
import { AppInput, AppSelect, AppTextarea, AppCheckbox, FormField, FormRow } from '../components/ui'
import { toInputDate } from '../shared/formatDisplayDate'
import TeacherSalaryPanel from '../components/TeacherSalaryPanel'

const emptyLoc = () => ({ ur: '', en: '' })

function refId(v) {
  if (v == null || v === '') return null
  return String(v._id || v)
}

function normalizeAssignments(list) {
  return (Array.isArray(list) ? list : [])
    .map((a) => ({
      sessionId: refId(a?.sessionId),
      darjahId: refId(a?.darjahId),
      subjectId: refId(a?.subjectId),
      bookId: refId(a?.bookId),
    }))
    .filter((a) => a.sessionId)
}

function defaultForm() {
  return {
    name: emptyLoc(),
    parentage: emptyLoc(),
    idCard: '',
    phone: '',
    maritalStatus: '',
    dateOfBirth: '',
    country: emptyLoc(),
    state: emptyLoc(),
    cityLoc: emptyLoc(),
    districtCurrent: emptyLoc(),
    districtPermanent: emptyLoc(),
    addressCurrent: emptyLoc(),
    addressPermanent: emptyLoc(),
    deeniTaleem: '',
    asriTaleem: '',
    extraSkills: '',
    jobStartDate: '',
    jobEndDate: '',
    status: 'active',
    assignments: [],
    __aDraft: { sessionId: '', darjahId: '', subjectId: '', bookId: '' },
  }
}

export default function TeacherFormPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const lang = uiLang(lng)
  const { showFlash } = useFlash()

  const { data: teacher, isLoading, isError } = useGetTeacherQuery(id, { skip: isNew })
  const [createOne] = useCreateTeacherMutation()
  const [updateOne] = useUpdateTeacherMutation()

  const [tab, setTab] = useState('basic')
  const [form, setFormState] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const setForm = useCallback((next) => {
    setDirty(true)
    setFormState(next)
  }, [])
  const { isBlocked, proceed, reset } = useUnsavedChangesGuard(dirty && !saving)

  const { data: sessions = [] } = useGetSessionsQuery()
  const { data: darajat = [] } = useGetDarajatQuery()
  const draftSes = form.__aDraft?.sessionId
  const { data: allSubjects = [] } = useGetSubjectsQuery()
  const subjectsInSession = useMemo(
    () =>
      draftSes
        ? allSubjects.filter(
            (s) => String(s.sessionId?._id || s.sessionId || '') === String(draftSes)
          )
        : [],
    [allSubjects, draftSes]
  )
  const draftSub = form.__aDraft?.subjectId
  const draftDj = form.__aDraft?.darjahId
  const { data: books = [] } = useGetSubjectBooksQuery(
    draftSub && draftDj ? { subjectId: draftSub, darjahId: draftDj } : undefined,
    { skip: !draftSub || !draftDj }
  )
  // All books — used to resolve titles for assignment rows (draft books reset after add)
  const { data: allBooks = [] } = useGetSubjectBooksQuery()

  const bookTitleById = useMemo(() => {
    const m = new Map()
    for (const b of allBooks) {
      m.set(String(b._id), loc(b.title, lng))
    }
    return m
  }, [allBooks, lng])

  const { data: geoCountries = [] } = useGetGeoCountriesQuery()

  useEffect(() => {
    if (isNew) {
      setFormState(defaultForm())
      setTab('basic')
      setDirty(false)
      return
    }
    if (teacher) {
      setFormState({
        ...defaultForm(),
        ...teacher,
        dateOfBirth: toInputDate(teacher.dateOfBirth),
        jobStartDate: toInputDate(teacher.jobStartDate),
        jobEndDate: toInputDate(teacher.jobEndDate),
        assignments: normalizeAssignments(teacher.assignments),
        __aDraft: { sessionId: '', darjahId: '', subjectId: '', bookId: '' },
      })
      setTab('basic')
      setDirty(false)
    }
  }, [isNew, teacher])

  // Default country = Pakistan — must run *after* the new-teacher reset above (same tick: this effect is declared next).
  useEffect(() => {
    if (!geoCountries?.length) return
    setFormState((prev) => {
      if (prev.country?.ur || prev.country?.en) return prev
      const pk = geoCountries.find((x) => x.code === 'PK')
      if (!pk?.name) return prev
      return {
        ...prev,
        country: { ur: pk.name.ur || '', en: pk.name.en || '' },
        state: emptyLoc(),
        cityLoc: emptyLoc(),
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
  useEffect(() => {
    if (!isNew && !isLoading && isError) navigate('/teachers', { replace: true })
  }, [isNew, isLoading, isError, navigate])

  const darjahOptions = useMemo(() => {
    const inSession = darajat.filter(
      (d) => String(d.sessionId?._id || d.sessionId || '') === String(form.__aDraft?.sessionId || '')
    )
    const subId = form.__aDraft?.subjectId
    if (!subId) return []
    return inSession.filter((d) =>
      (d.subjectIds || []).some((x) => String(x._id || x) === String(subId))
    )
  }, [darajat, form.__aDraft?.sessionId, form.__aDraft?.subjectId])

  const subjectOptionsForSession = subjectsInSession

  function countryIndex() {
    if (!form.country?.ur && !form.country?.en) return ''
    const i = geoCountries.findIndex((c) => (c.name?.ur || '') === (form.country?.ur || '') && (c.name?.en || '') === (form.country?.en || ''))
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
    const i = geoStates.findIndex((c) => (c.name?.ur || '') === (form.state?.ur || '') && (c.name?.en || '') === (form.state?.en || ''))
    return i >= 0 ? String(i) : ''
  }
  function cityIndex() {
    if (!form.cityLoc?.ur && !form.cityLoc?.en) return ''
    if (usePakistanStatic && pkProvinceKey) {
      const ur = (form.cityLoc?.ur || '').trim()
      const i = pkCities.findIndex((n) => n === ur || n === (form.cityLoc?.en || '').trim())
      return i >= 0 ? String(i) : ''
    }
    const i = geoCities.findIndex((c) => (c.name?.ur || '') === (form.cityLoc?.ur || '') && (c.name?.en || '') === (form.cityLoc?.en || ''))
    return i >= 0 ? String(i) : ''
  }
  function setCountryByIndex(i) {
    if (i === '' || i == null) {
      const pk = geoCountries.find((x) => x.code === 'PK')
      setForm({
        ...form,
        country: pk?.name ? { ur: pk.name.ur || '', en: pk.name.en || '' } : emptyLoc(),
        state: emptyLoc(),
        cityLoc: emptyLoc(),
      })
      return
    }
    const row = geoCountries[Number(i)]
    setForm({ ...form, country: row?.name ? { ur: row.name.ur || '', en: row.name.en || '' } : emptyLoc(), state: emptyLoc(), cityLoc: emptyLoc() })
  }
  function setStateByIndex(i) {
    if (i === '' || i == null) {
      setForm({ ...form, state: emptyLoc(), cityLoc: emptyLoc() })
      return
    }
    if (usePakistanStatic) {
      const key = PAKISTAN_PROVINCE_KEYS[Number(i)]
      if (!key) {
        setForm({ ...form, state: emptyLoc(), cityLoc: emptyLoc() })
        return
      }
      setForm({
        ...form,
        state: { ur: provinceUrDisplay(key), en: provinceEn(key) },
        cityLoc: emptyLoc(),
      })
      return
    }
    const row = geoStates[Number(i)]
    setForm({ ...form, state: row?.name ? { ur: row.name.ur || '', en: row.name.en || '' } : emptyLoc(), cityLoc: emptyLoc() })
  }
  function setCityByIndex(i) {
    if (i === '' || i == null) {
      setForm({ ...form, cityLoc: emptyLoc() })
      return
    }
    if (usePakistanStatic && pkProvinceKey) {
      const name = pkCities[Number(i)]
      setForm({ ...form, cityLoc: name ? cityLocFromUrduName(name) : emptyLoc() })
      return
    }
    const row = geoCities[Number(i)]
    setForm({ ...form, cityLoc: row?.name ? { ur: row.name.ur || '', en: row.name.en || '' } : emptyLoc() })
  }

  async function save(e) {
    e.preventDefault()
    const trimmed = trimFormStrings(form)
    if (!isValidCnic(trimmed.idCard)) {
      showFlash(t('validation.invalidCnic'))
      return
    }
    if (!isValidPhone(trimmed.phone)) {
      showFlash(t('validation.invalidPhone'))
      return
    }
    setSaving(true)
    try {
      const { __aDraft, _id, tenantId, createdAt, updatedAt, __v, ...payload } = trimmed
      if (payload.idCard) payload.idCard = formatCnicDisplay(payload.idCard)
      payload.dateOfBirth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : null
      payload.jobStartDate = payload.jobStartDate ? new Date(payload.jobStartDate) : null
      payload.jobEndDate = payload.jobEndDate ? new Date(payload.jobEndDate) : null
      payload.assignments = normalizeAssignments(payload.assignments)
      if (isNew) await createOne(payload).unwrap()
      else await updateOne({ id, ...payload }).unwrap()
      setDirty(false)
      navigate('/teachers')
    } catch (err) {
      showFlash(err?.data?.message || err?.error || err?.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => navigate('/teachers')}
            lang={lang}
          >
            {lng === 'ur' ? 'واپس' : 'Back'}
          </button>
          <h1 className="h5 mb-0 fw-bold" lang={lang}>
            {lng === 'ur' ? (isNew ? 'نیا استاد شامل کریں' : 'استاد میں ترمیم') : isNew ? 'Add new teacher' : 'Edit teacher'}
          </h1>
        </div>
      </div>

      <form className="content-panel p-3 p-md-4 mb-4" onSubmit={save}>
        <div className="teacher-enrollment-form">
          <ul className="nav nav-tabs flex-wrap mb-3" role="tablist">
            {[
              { id: 'basic', ur: 'بنیادی معلومات', en: 'Basic info' },
              { id: 'education', ur: 'تعلیمی اہلیت', en: 'Education' },
              { id: 'assign', ur: 'اسائنمنٹ', en: 'Assignments' },
              { id: 'salary', ur: 'تنخواہ', en: 'Salary' },
            ].map((x) => (
              <li key={x.id} className="nav-item" role="presentation">
                <button
                  type="button"
                  className={`nav-link ${tab === x.id ? 'active' : ''}`}
                  onClick={() => setTab(x.id)}
                >
                  <span className={`bilingual-label__text--${lang}`} lang={lang}>
                    {lng === 'ur' ? x.ur : x.en}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {tab === 'basic' && (
            <FormRow>
              <FormField k="teacherNameUr" htmlFor="t-name-ur" col={4} required langField="ur">
                <AppInput
                  id="t-name-ur"
                  data-lang-field="ur"
                  value={form.name?.ur || ''}
                  onChange={(e) => setForm({ ...form, name: { ...(form.name || emptyLoc()), ur: e.target.value } })}
                  dir="rtl"
                />
              </FormField>
              <FormField k="teacherNameEn" htmlFor="t-name-en" col={4} langField="en">
                <AppInput
                  id="t-name-en"
                  latin
                  data-lang-field="en"
                  value={form.name?.en || ''}
                  onChange={(e) => setForm({ ...form, name: { ...(form.name || emptyLoc()), en: e.target.value } })}
                />
              </FormField>
              <FormField k="teacherWalidiyat" htmlFor="t-par" col={4}>
                <AppInput
                  id="t-par"
                  value={loc(form.parentage || emptyLoc(), lng)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      parentage: lng === 'ur' ? { ...(form.parentage || emptyLoc()), ur: e.target.value } : { ...(form.parentage || emptyLoc()), en: e.target.value },
                    })
                  }
                  dir={lng === 'ur' ? 'rtl' : undefined}
                />
              </FormField>
              <FormField k="idCard" htmlFor="t-id" col={4}>
                <AppInput
                  id="t-id"
                  latin
                  value={form.idCard || ''}
                  onChange={(e) => setForm({ ...form, idCard: e.target.value })}
                />
              </FormField>
              <FormField k="dateOfBirth" htmlFor="t-dob" col={4}>
                <AppDateInput
                  id="t-dob"
                  lng={lng}
                  value={form.dateOfBirth || ''}
                  onChange={(v) => setForm({ ...form, dateOfBirth: v })}
                  emptyCalendarYear={1990}
                />
              </FormField>
              <FormField k="maritalStatus" htmlFor="t-ms" col={4}>
                <AppSelect
                  id="t-ms"
                  value={form.maritalStatus || ''}
                  onValueChange={(v) => setForm({ ...form, maritalStatus: v })}
                >
                  <option value="">—</option>
                  <option value="single">{lng === 'ur' ? 'غیر شادی شدہ' : 'Single'}</option>
                  <option value="married">{lng === 'ur' ? 'شادی شدہ' : 'Married'}</option>
                  <option value="widowed">{lng === 'ur' ? 'بیوہ' : 'Widowed'}</option>
                  <option value="divorced">{lng === 'ur' ? 'طلاق یافتہ' : 'Divorced'}</option>
                </AppSelect>
              </FormField>
              <FormField k="phone" htmlFor="t-phone" col={4}>
                <AppInput
                  id="t-phone"
                  latin
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </FormField>
              <div className="app-form-col app-form-col--12 mt-2">
                <FlSectionTitle k="addressInfoSection" className="mb-2 pb-1" />
              </div>
              <FormField k="teacherCountry" htmlFor="t-country" col={4}>
                <AppSelect
                  id="t-country"
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
              <FormField k="teacherState" htmlFor="t-state" col={4}>
                <AppSelect
                  id="t-state"
                  value={stateIndex()}
                  onValueChange={(v) => setStateByIndex(v)}
                  disabled={!selectedGeoCountry}
                  dir={lng === 'ur' ? 'rtl' : 'ltr'}
                  lang={lang}
                  style={{ fontFamily: lng === 'ur' ? 'var(--font-urdu)' : undefined }}
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
              <FormField k="teacherCity" htmlFor="t-city" col={4}>
                <AppSelect
                  id="t-city"
                  value={cityIndex()}
                  onValueChange={(v) => setCityByIndex(v)}
                  disabled={usePakistanStatic ? !pkProvinceKey : !selectedGeoState}
                  dir={lng === 'ur' ? 'rtl' : 'ltr'}
                  lang={lang}
                  style={{ fontFamily: lng === 'ur' ? 'var(--font-urdu)' : undefined }}
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
              <FormField k="teacherAddressCurrent" htmlFor="t-ac" col={4}>
                <AppInput
                  id="t-ac"
                  value={loc(form.addressCurrent || emptyLoc(), lng)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      addressCurrent: lng === 'ur' ? { ...(form.addressCurrent || emptyLoc()), ur: e.target.value } : { ...(form.addressCurrent || emptyLoc()), en: e.target.value },
                    })
                  }
                  dir={lng === 'ur' ? 'rtl' : undefined}
                />
              </FormField>
              <FormField k="teacherAddressPermanent" htmlFor="t-ap" col={4}>
                <AppInput
                  id="t-ap"
                  value={loc(form.addressPermanent || emptyLoc(), lng)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      addressPermanent: lng === 'ur' ? { ...(form.addressPermanent || emptyLoc()), ur: e.target.value } : { ...(form.addressPermanent || emptyLoc()), en: e.target.value },
                    })
                  }
                  dir={lng === 'ur' ? 'rtl' : undefined}
                />
              </FormField>
              <FormField k="jobStartDate" htmlFor="t-js" col={4}>
                <AppDateInput
                  id="t-js"
                  lng={lng}
                  value={form.jobStartDate || ''}
                  onChange={(v) => setForm({ ...form, jobStartDate: v })}
                />
              </FormField>
              <FormField k="jobEndDate" htmlFor="t-je" col={4}>
                <AppDateInput
                  id="t-je"
                  lng={lng}
                  value={form.jobEndDate || ''}
                  onChange={(v) => setForm({ ...form, jobEndDate: v })}
                />
              </FormField>
              <FormField k="status" htmlFor="t-status" col={4}>
                <AppSelect
                  id="t-status"
                  value={form.status || 'active'}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <option value="active">{lng === 'ur' ? 'فعال' : 'Active'}</option>
                  <option value="inactive">{lng === 'ur' ? 'غیر فعال' : 'Inactive'}</option>
                  <option value="leave">{lng === 'ur' ? 'رخصت' : 'Leave'}</option>
                </AppSelect>
              </FormField>
            </FormRow>
          )}

          {tab === 'education' && (
            <FormRow>
              <FormField k="deeniTaleem" htmlFor="t-deen" col={4}>
                <AppInput
                  id="t-deen"
                  value={form.deeniTaleem || ''}
                  onChange={(e) => setForm({ ...form, deeniTaleem: e.target.value })}
                />
              </FormField>
              <FormField k="asriTaleem" htmlFor="t-asri" col={4}>
                <AppInput
                  id="t-asri"
                  value={form.asriTaleem || ''}
                  onChange={(e) => setForm({ ...form, asriTaleem: e.target.value })}
                />
              </FormField>
              <FormField k="extraSkills" htmlFor="t-skill" col={12}>
                <AppInput
                  id="t-skill"
                  value={form.extraSkills || ''}
                  onChange={(e) => setForm({ ...form, extraSkills: e.target.value })}
                />
              </FormField>
            </FormRow>
          )}

          {tab === 'assign' && (
            <div>
              <FormRow className="align-items-end">
                <FormField k="sessionTitle" htmlFor="ta-ses" col={4}>
                  <AppSelect
                    id="ta-ses"
                    value={form.__aDraft?.sessionId || ''}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        __aDraft: {
                          ...(form.__aDraft || {}),
                          sessionId: v,
                          darjahId: '',
                          subjectId: '',
                          bookId: '',
                        },
                      })
                    }
                  >
                    <option value="">—</option>
                    {sessions.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.title}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>
                <FormField k="subjectName" htmlFor="ta-sub" col={4}>
                  <AppSelect
                    id="ta-sub"
                    value={form.__aDraft?.subjectId || ''}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        __aDraft: {
                          ...(form.__aDraft || {}),
                          subjectId: v,
                          darjahId: '',
                          bookId: '',
                        },
                      })
                    }
                    disabled={!form.__aDraft?.sessionId}
                  >
                    <option value="">—</option>
                    {subjectOptionsForSession.map((s) => (
                      <option key={s._id} value={s._id}>
                        {loc(s.name, lng)}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>
                <FormField k="darjahName" htmlFor="ta-dj" col={4}>
                  <AppSelect
                    id="ta-dj"
                    value={form.__aDraft?.darjahId || ''}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        __aDraft: {
                          ...(form.__aDraft || {}),
                          darjahId: v,
                          bookId: '',
                        },
                      })
                    }
                    disabled={!form.__aDraft?.subjectId}
                  >
                    <option value="">—</option>
                    {darjahOptions.map((d) => (
                      <option key={d._id} value={d._id}>
                        {loc(d.name, lng)}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>
              </FormRow>
              <FormRow className="align-items-end mt-1 mt-md-0">
                <FormField k="bookTitle" htmlFor="ta-bk" col={4}>
                  <AppSelect
                    id="ta-bk"
                    value={form.__aDraft?.bookId || ''}
                    onValueChange={(v) => setForm({ ...form, __aDraft: { ...(form.__aDraft || {}), bookId: v } })}
                    disabled={!form.__aDraft?.subjectId || !form.__aDraft?.darjahId}
                  >
                    <option value="">{lng === 'ur' ? '— (اختیاری)' : '— (optional)'}</option>
                    {books.map((b) => (
                      <option key={b._id} value={b._id}>
                        {loc(b.title, lng)}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>
                <div className="app-form-col app-form-col--4 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success w-100"
                    onClick={() => {
                      const d = form.__aDraft || {}
                      if (!d.sessionId || !d.darjahId || !d.subjectId) return
                      const next = [
                        ...(Array.isArray(form.assignments) ? form.assignments : []),
                        {
                          sessionId: String(d.sessionId),
                          darjahId: d.darjahId ? String(d.darjahId) : null,
                          subjectId: d.subjectId ? String(d.subjectId) : null,
                          bookId: d.bookId ? String(d.bookId) : null,
                        },
                      ]
                      setForm({
                        ...form,
                        assignments: next,
                        __aDraft: { sessionId: d.sessionId, darjahId: '', subjectId: '', bookId: '' },
                      })
                    }}
                  >
                    {t('common.add')}
                  </button>
                </div>
              </FormRow>

              <div className="table-responsive mt-2">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th>{lng === 'ur' ? 'سیشن' : 'Session'}</th>
                      <th>{lng === 'ur' ? 'شعبہ جات' : 'Subajat'}</th>
                      <th>{lng === 'ur' ? 'درجہ' : 'Darjah'}</th>
                      <th>{lng === 'ur' ? 'کتاب' : 'Book'}</th>
                      <th>{flText(FL.delete, lng)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(form.assignments) ? form.assignments : []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted text-center py-3">—</td>
                      </tr>
                    ) : (
                      (form.assignments || []).map((a, idx) => {
                        const sesId = a.sessionId?._id || a.sessionId
                        const djId = a.darjahId?._id || a.darjahId
                        const subId = a.subjectId?._id || a.subjectId
                        const bkId = a.bookId?._id || a.bookId
                        const ses = sessions.find((s) => String(s._id) === String(sesId))
                        const dj = darajat.find((d) => String(d._id) === String(djId))
                        const sub = allSubjects.find((s) => String(s._id) === String(subId))
                        const bkTitle = bkId ? bookTitleById.get(String(bkId)) : null
                        return (
                          <tr key={idx}>
                            <td className="table-num">{ses?.title || '—'}</td>
                            <td>{sub ? loc(sub.name, lng) : '—'}</td>
                            <td>{dj ? loc(dj.name, lng) : '—'}</td>
                            <td>{bkTitle || '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setForm({ ...form, assignments: (form.assignments || []).filter((_, j) => j !== idx) })}
                              >
                                {flText(FL.delete, lng)}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'salary' &&
            (isNew ? (
              <div className="rounded-3 border border-secondary-subtle bg-body-secondary bg-opacity-25 p-4 text-center" lang={lang}>
                <p className="mb-3">
                  {lng === 'ur'
                    ? 'تنخواہ کا اندراج اس استاد کو محفوظ کرنے کے بعد دستیاب ہو گا۔'
                    : 'Salary entries will be available after you save this teacher.'}
                </p>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate('/teachers?tab=salary')}>
                  {lng === 'ur' ? 'اساتذہ کی تنخواہ کا صفحہ' : 'Teacher salaries page'}
                </button>
              </div>
            ) : (
              <TeacherSalaryPanel teachers={teacher ? [teacher] : []} lng={lng} fixedTeacherId={id} embedded />
            ))}

        </div>

        <div className="d-flex flex-wrap gap-2 justify-content-end mt-4 pt-3 border-top border-secondary-subtle">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/teachers')} disabled={saving} lang={lang}>
            {flText(FL.cancel, lng)}
          </button>
          <button type="submit" className="btn btn-success" disabled={saving} lang={lang}>
            {flText(FL.save, lng)}
          </button>
        </div>
      </form>

      <ConfirmActionModal
        open={isBlocked}
        title={t('common.unsavedTitle')}
        message={t('common.unsavedBody')}
        confirmLabel={t('common.leave')}
        confirmVariant="danger"
        onClose={reset}
        onConfirm={() => {
          proceed()
        }}
      />
    </div>
  )
}

