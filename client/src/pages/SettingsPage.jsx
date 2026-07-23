import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetSettingsQuery, usePatchSettingsMutation } from '../services/api'
import PageHeading from '../components/PageHeading'
import BilingualLabel, { FlSectionTitle } from '../components/BilingualLabel'
import BasicTartibatPanel from '../components/BasicTartibatPanel'
import { AppInput } from '../components/ui'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { data: settings, refetch } = useGetSettingsQuery()
  const [patch] = usePatchSettingsMutation()
  const [addr, setAddr] = useState({ ur: '', en: '' })
  const [college, setCollege] = useState({ ur: '', en: '' })

  useEffect(() => {
    if (settings?.address) setAddr(settings.address)
    if (settings?.collegeAffiliation) setCollege(settings.collegeAffiliation)
  }, [settings])

  async function saveSettings(e) {
    e.preventDefault()
    await patch({ address: addr, collegeAffiliation: college }).unwrap()
    refetch()
  }

  return (
    <div>
      <PageHeading navKey="navSettings" />
      <form className="content-panel p-4 mb-4" onSubmit={saveSettings}>
        <FlSectionTitle k="settingsAddressBlock" />
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <BilingualLabel k="addressUr" htmlFor="set-addr-ur" />
            <AppInput
              id="set-addr-ur"
              value={addr.ur}
              onChange={(e) => setAddr({ ...addr, ur: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <BilingualLabel k="addressEn" htmlFor="set-addr-en" />
            <AppInput
              id="set-addr-en"
              value={addr.en}
              onChange={(e) => setAddr({ ...addr, en: e.target.value })}
            />
          </div>
        </div>
        <FlSectionTitle k="collegeAffiliationSection" />
        <div className="row g-2 mb-2">
          <div className="col-md-6">
            <BilingualLabel k="collegeUr" htmlFor="set-col-ur" />
            <AppInput
              id="set-col-ur"
              value={college.ur}
              onChange={(e) => setCollege({ ...college, ur: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <BilingualLabel k="collegeEn" htmlFor="set-col-en" />
            <AppInput
              id="set-col-en"
              value={college.en}
              onChange={(e) => setCollege({ ...college, en: e.target.value })}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-success btn-sm">
          {t('common.save')}
        </button>
      </form>

      <BasicTartibatPanel />

      <p className="text-muted small px-1 mb-4">
        {lng === 'ur'
          ? 'بنیادی ترتیبات کا ڈیٹا موجودہ لاگ ان ادارے (ٹیننٹ) سے منسلک ہے۔ دیگر صفحات پر ڈراپ ڈاؤن اور فہرستوں میں یہی اندراج استعمال کریں۔'
          : 'Basic tartibat lists belong to the signed-in organization (tenant). Use the same data for dropdowns and lookups across the app.'}
      </p>
    </div>
  )
}
