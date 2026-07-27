import { useState } from 'react'
import StudentIdCardFace from './StudentIdCard'
import './studentIdCard.css'
import './idCardFlipPreview.css'

/**
 * Interactive CR80 flip preview (screen only — not for print).
 * Click or Flip button toggles front ↔ back.
 */
export default function IdCardFlipPreview({
  student,
  card,
  lng = 'ur',
  calendarMode = 'gregorian',
  institutionName = '',
  institutionNameUr = '',
  logoUrl = '',
  instituteAddress = '',
  templateKey = 'pvc-prestige',
  showQr = true,
  showBloodGroup = true,
  showAddress = true,
  flipped: controlledFlipped,
  onFlip,
  className = '',
}) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const en = String(lng).toLowerCase().startsWith('en')
  const isControlled = controlledFlipped != null
  const flipped = isControlled ? Boolean(controlledFlipped) : internalFlipped

  function toggle() {
    if (isControlled) onFlip?.(!flipped)
    else setInternalFlipped((v) => !v)
  }

  const faceProps = {
    student,
    card,
    lng,
    calendarMode,
    institutionName,
    institutionNameUr,
    logoUrl,
    instituteAddress,
    templateKey,
    showQr,
    showBloodGroup,
    showAddress,
  }

  return (
    <div className={`idc-flip ${className}`.trim()}>
      <button
        type="button"
        className={`idc-flip__stage${flipped ? ' is-flipped' : ''}`}
        onClick={toggle}
        aria-pressed={flipped}
        aria-label={en ? (flipped ? 'Show front' : 'Show back') : flipped ? 'سامنے دکھائیں' : 'پشت دکھائیں'}
      >
        <div className="idc-flip__inner">
          <div className="idc-flip__face idc-flip__face--front">
            <StudentIdCardFace side="front" {...faceProps} />
          </div>
          <div className="idc-flip__face idc-flip__face--back">
            <StudentIdCardFace side="back" {...faceProps} />
          </div>
        </div>
      </button>
      <div className="idc-flip__controls">
        <span className="idc-flip__hint">
          {flipped
            ? en
              ? 'Back side'
              : 'پشت'
            : en
              ? 'Front side'
              : 'سامنے'}
        </span>
        <button type="button" className="btn btn-sm btn-outline-primary idc-flip__btn" onClick={toggle}>
          {en ? 'Flip card' : 'پلٹائیں'}
        </button>
      </div>
    </div>
  )
}
