import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout, setUser } from '../features/auth/authSlice'
import {
  api,
  useGetMeQuery,
  usePatchMeMutation,
  useChangePasswordMutation,
  useGetSettingsQuery,
  usePatchSettingsMutation,
  useUploadTenantLogoMutation,
  usePatchTenantMutation,
} from '../services/api'
import { loc, flText } from '../shared/localized'
import { FL } from '../shared/fieldLabels'
import { absoluteAssetUrl } from '../shared/assetUrl'
import { getInstitutionName, getInstitutionInitial } from '../shared/institutionBrand'
import PageHeading from '../components/PageHeading'
import { AppInput, FormField, FormRow } from '../components/ui'
import { useFlash } from '../app/flash.jsx'

function SettingsSection({ title, hint, children, onSave, saveLabel, saveVariant = 'success', formId, className = '' }) {
  return (
    <section className={`settings-section ${className}`.trim()}>
      <header className="settings-section__head">
        <div className="settings-section__titles min-w-0">
          <h2 className="settings-section__title mb-0">{title}</h2>
          {hint ? <p className="settings-section__hint mb-0">{hint}</p> : null}
        </div>
        {onSave ? (
          <button type="submit" form={formId} className={`btn btn-${saveVariant} btn-sm settings-section__save`}>
            {saveLabel}
          </button>
        ) : null}
      </header>
      <div className="settings-section__body">{children}</div>
    </section>
  )
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.startsWith('en')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { showFlash } = useFlash()
  const logoInputRef = useRef(null)

  const { data: me, refetch } = useGetMeQuery()
  const { data: settings, refetch: refetchSettings } = useGetSettingsQuery()
  const [patchMe] = usePatchMeMutation()
  const [changePw] = useChangePasswordMutation()
  const [patchSettings] = usePatchSettingsMutation()
  const [patchTenant] = usePatchTenantMutation()
  const [uploadLogo, { isLoading: logoUploading }] = useUploadTenantLogoMutation()

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState({ ur: '', en: '' })
  const [tenantName, setTenantName] = useState({ ur: '', en: '' })
  const [addr, setAddr] = useState({ ur: '', en: '' })
  const [college, setCollege] = useState({ ur: '', en: '' })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (me) {
      setEmail(me.email || '')
      setPhone(me.phone || '')
      setName(me.name || { ur: '', en: '' })
      if (me.tenant?.name) setTenantName(me.tenant.name)
    }
  }, [me])

  useEffect(() => {
    if (settings?.address) setAddr(settings.address)
    if (settings?.collegeAffiliation) setCollege(settings.collegeAffiliation)
  }, [settings])

  const logoAbs = absoluteAssetUrl(settings?.logoUrl)
  const tenantLabel = getInstitutionName(me, lng)
  const displayName = me?.name ? loc(me.name, lng) : ''

  async function saveProfile(e) {
    e.preventDefault()
    const updated = await patchMe({ email, phone, name }).unwrap()
    dispatch(setUser(updated))
    refetch()
  }

  async function saveInstitute(e) {
    e.preventDefault()
    const [tenantRes] = await Promise.all([
      patchTenant({ name: tenantName }).unwrap(),
      patchSettings({ address: addr, collegeAffiliation: college }).unwrap(),
    ])
    if (tenantRes?.tenant) dispatch(setUser({ tenant: tenantRes.tenant }))
    refetchSettings()
    refetch()
  }

  async function onLogoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const fd = new FormData()
    fd.append('logo', file)
    try {
      await uploadLogo(fd).unwrap()
      refetchSettings()
    } catch (err) {
      showFlash(err?.data?.message || err?.error || (en ? 'Logo upload failed' : 'لوگو اپ لوڈ نہیں ہوا'))
    }
  }

  async function removeLogo() {
    await patchSettings({ logoUrl: '' }).unwrap()
    refetchSettings()
  }

  async function savePassword(e) {
    e.preventDefault()
    await changePw({ currentPassword, newPassword }).unwrap()
    setCurrentPassword('')
    setNewPassword('')
    dispatch(logout())
    dispatch(api.util.resetApiState())
    navigate('/login', { replace: true })
  }

  const accountTitle = en ? 'Your account' : 'آپ کا اکاؤنٹ'
  const instituteTitle = en ? 'Madrasa / institution' : 'مدرسہ / ادارہ'
  const instituteHint = en
    ? 'Logo, address and affiliation appear on prints and cards.'
    : 'لوگو، پتہ اور وابستگی پرنٹ و کارڈز پر دکھائی دیتے ہیں۔'
  const passwordHint = en
    ? 'You will be signed out after changing password.'
    : 'پاس ورڈ بدلنے کے بعد دوبارہ لاگ ان کریں۔'

  return (
    <div className="profile-page">
      <PageHeading navKey="navProfile" />

      <div className="settings-sheet content-panel">
        <div className="settings-sheet__org">
          <div className="settings-sheet__org-logo">
            {logoAbs ? (
              <img src={logoAbs} alt="" />
            ) : (
              <span aria-hidden>{getInstitutionInitial(me, lng, 'م')}</span>
            )}
          </div>
          <div className="settings-sheet__org-text min-w-0">
            <div className="settings-sheet__org-name text-truncate" lang={en ? 'en' : 'ur'}>
              {tenantLabel || flText(FL.navProfile, lng)}
            </div>
            <div className="settings-sheet__org-meta text-truncate">
              {displayName ? <span>{displayName}</span> : null}
              {displayName && me?.email ? <span className="settings-sheet__dot">·</span> : null}
              {me?.email ? <span className="table-num latin-input">{me.email}</span> : null}
            </div>
          </div>
        </div>

        <div className="settings-sheet__main">
          <SettingsSection
            title={accountTitle}
            formId="profile-account-form"
            onSave
            saveLabel={t('common.save')}
            className="settings-section--split"
          >
            <form id="profile-account-form" onSubmit={saveProfile} className="settings-form">
              <div className="settings-form__stack">
                <FormField k="nameUrField" htmlFor="p-name-ur" langField="ur">
                  <AppInput
                    id="p-name-ur"
                    value={name.ur}
                    onChange={(e) => setName({ ...name, ur: e.target.value })}
                    data-lang-field="ur"
                  />
                </FormField>
                <FormField k="nameEnField" htmlFor="p-name-en" langField="en">
                  <AppInput
                    id="p-name-en"
                    latin
                    value={name.en}
                    onChange={(e) => setName({ ...name, en: e.target.value })}
                    data-lang-field="en"
                  />
                </FormField>
                <FormField k="email" htmlFor="p-email">
                  <AppInput
                    id="p-email"
                    type="email"
                    latin
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormField>
                <FormField k="phone" htmlFor="p-phone">
                  <AppInput id="p-phone" latin value={phone} onChange={(e) => setPhone(e.target.value)} />
                </FormField>
              </div>
            </form>
          </SettingsSection>

          <SettingsSection
            title={instituteTitle}
            hint={instituteHint}
            formId="profile-institute-form"
            onSave
            saveLabel={t('common.save')}
            className="settings-section--split"
          >
            <form id="profile-institute-form" onSubmit={saveInstitute} className="settings-form">
              <div className="settings-form__stack">
                <FormField k="institutionNameUr" htmlFor="p-tenant-ur" langField="ur">
                  <AppInput
                    id="p-tenant-ur"
                    value={tenantName.ur}
                    onChange={(e) => setTenantName({ ...tenantName, ur: e.target.value })}
                    data-lang-field="ur"
                  />
                </FormField>
                <FormField k="institutionNameEn" htmlFor="p-tenant-en" langField="en">
                  <AppInput
                    id="p-tenant-en"
                    latin
                    value={tenantName.en}
                    onChange={(e) => setTenantName({ ...tenantName, en: e.target.value })}
                    data-lang-field="en"
                  />
                </FormField>
              </div>

              <div className="settings-logo-bar">
                <div className="settings-logo-bar__thumb">
                  {logoAbs ? (
                    <img src={logoAbs} alt="" />
                  ) : (
                    <span className="settings-logo-bar__empty">{en ? 'Logo' : 'لوگو'}</span>
                  )}
                </div>
                <div className="settings-logo-bar__actions">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="d-none"
                    onChange={onLogoChange}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoUploading ? (en ? 'Uploading…' : 'اپ لوڈ…') : en ? 'Upload' : 'اپ لوڈ'}
                  </button>
                  {logoAbs ? (
                    <button type="button" className="btn btn-link btn-sm text-danger px-2" onClick={removeLogo}>
                      {en ? 'Remove' : 'ہٹائیں'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="settings-subhead">{flText(FL.settingsAddressBlock, lng)}</div>
              <div className="settings-form__stack">
                <FormField k="addressUr" htmlFor="p-addr-ur" langField="ur">
                  <AppInput
                    id="p-addr-ur"
                    value={addr.ur}
                    onChange={(e) => setAddr({ ...addr, ur: e.target.value })}
                    data-lang-field="ur"
                  />
                </FormField>
                <FormField k="addressEn" htmlFor="p-addr-en" langField="en">
                  <AppInput
                    id="p-addr-en"
                    value={addr.en}
                    onChange={(e) => setAddr({ ...addr, en: e.target.value })}
                    data-lang-field="en"
                  />
                </FormField>
              </div>

              <div className="settings-subhead">{flText(FL.collegeAffiliationSection, lng)}</div>
              <div className="settings-form__stack">
                <FormField k="collegeUr" htmlFor="p-col-ur" langField="ur">
                  <AppInput
                    id="p-col-ur"
                    value={college.ur}
                    onChange={(e) => setCollege({ ...college, ur: e.target.value })}
                    data-lang-field="ur"
                  />
                </FormField>
                <FormField k="collegeEn" htmlFor="p-col-en" langField="en">
                  <AppInput
                    id="p-col-en"
                    value={college.en}
                    onChange={(e) => setCollege({ ...college, en: e.target.value })}
                    data-lang-field="en"
                  />
                </FormField>
              </div>
            </form>
          </SettingsSection>
        </div>

        <SettingsSection
          title={flText(FL.passwordSection, lng)}
          hint={passwordHint}
          formId="profile-password-form"
          onSave
          saveLabel={t('common.save')}
          saveVariant="outline-secondary"
          className="settings-section--footer"
        >
          <form id="profile-password-form" onSubmit={savePassword} className="settings-form">
            <FormRow className="settings-form__row settings-form__row--inline">
              <FormField k="currentPassword" htmlFor="p-cur-pw" col={6}>
                <AppInput
                  id="p-cur-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </FormField>
              <FormField k="newPassword" htmlFor="p-new-pw" col={6}>
                <AppInput
                  id="p-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </FormField>
            </FormRow>
          </form>
        </SettingsSection>
      </div>
    </div>
  )
}
