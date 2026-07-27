import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetIdCardTemplatesQuery, useGetMeQuery, useGetSettingsQuery } from '../services/api'
import { loc } from '../shared/localized'
import { getInstitutionName } from '../shared/institutionBrand'
import { absoluteAssetUrl } from '../shared/assetUrl'
import { useCalendarMode } from '../app/calendarMode'
import PageHeading from '../components/PageHeading'
import IdCardFlipPreview from '../components/id-cards/IdCardFlipPreview'
import './idCardsPage.css'
import '../components/id-cards/studentIdCard.css'

const SAMPLE_STUDENT = {
  studentId: '501',
  name: { ur: 'محمد طاہر', en: 'Muhammad Tahir' },
  fatherName: { ur: 'محمد فاروق', en: 'Muhammad Farooq' },
  dateOfBirth: '2014-02-13',
  phone: '0333-2254175',
  rollNumber: '501',
  photoUrl: '',
  addressCurrent: { ur: 'کراچی', en: 'Karachi' },
  sessionId: { title: '2025-26' },
  darjahId: { name: { ur: 'درجہ حفظ', en: 'Huffaz' }, code: '' },
  subjectId: { name: { ur: 'درس نظامی', en: 'Dars-e-Nizami' } },
}

const SAMPLE_CARD = {
  cardNumber: 'IDC-00001',
  bloodGroup: 'A+',
  qrToken: 'sample-preview-token-not-for-verify',
  expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
  issueDate: new Date().toISOString(),
}

export default function IdCardsTemplatesPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const navigate = useNavigate()
  const { mode } = useCalendarMode()
  const { data: templates = [], isLoading } = useGetIdCardTemplatesQuery()
  const { data: me } = useGetMeQuery()
  const { data: settings } = useGetSettingsQuery()
  const [active, setActive] = useState('pvc-prestige')

  const institutionName = getInstitutionName(me, 'en') || getInstitutionName(me, lng)
  const institutionNameUr = me?.tenant?.name?.ur || ''
  const logoUrl = settings?.logoUrl || ''
  const list = templates.length
    ? templates
    : [
        { key: 'pvc-prestige', name: { ur: 'پریسٹیج PVC', en: 'Prestige PVC' } },
        { key: 'pvc-classic', name: { ur: 'کلاسیک سبز', en: 'Classic Green' } },
      ]

  return (
    <div>
      <PageHeading navKey="navIdCardsTemplates">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/id-cards')}>
          {t('idCards.backToHub')}
        </button>
      </PageHeading>

      <p className="text-secondary mb-3">
        {en
          ? 'Fixed professional templates for v1. Pick one when generating or printing.'
          : 'v1 کے مقررہ پیشہ ورانہ ٹیمپلیٹس۔ جنریٹ یا پرنٹ کرتے وقت منتخب کریں۔'}
      </p>

      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <div className="id-cards-templates-grid">
          {list.map((tpl) => (
            <div
              key={tpl.key}
              className={`id-cards-template-tile${active === tpl.key ? ' is-active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setActive(tpl.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(tpl.key)
                }
              }}
            >
              <h2 className="id-cards-template-tile__title">{loc(tpl.name, lng) || tpl.key}</h2>
              <IdCardFlipPreview
                student={SAMPLE_STUDENT}
                card={{ ...SAMPLE_CARD, qrToken: '' }}
                lng={lng}
                calendarMode={mode}
                institutionName={institutionName}
                institutionNameUr={institutionNameUr}
                logoUrl={logoUrl ? absoluteAssetUrl(logoUrl) : ''}
                instituteAddress={loc(settings?.address, lng) || ''}
                templateKey={tpl.key}
                showQr={false}
                showBloodGroup
                showAddress
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
