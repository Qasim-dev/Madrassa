import { useTranslation } from 'react-i18next'
import PageHeading from '../components/PageHeading'

/** Placeholder — student character records will be added later. */
export default function StudentCharacterPage() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeading navKey="navStudentCharacter" />
      <div className="content-panel p-4">
        <p className="mb-0 text-secondary">{t('character.comingSoon')}</p>
      </div>
    </div>
  )
}
