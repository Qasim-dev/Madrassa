import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EXAM_PHASES, EXAM_WORKFLOW_STEPS } from '../../shared/examEnums'
import AppTabs from '../AppTabs'

export default function ExamPhaseStepper({
  step,
  onStepChange,
  stepLabels,
  enabledSteps,
  doneSteps,
}) {
  const { t, i18n } = useTranslation()
  const scrollerRef = useRef(null)
  const activePhase = EXAM_PHASES.find((phase) => phase.steps.includes(step)) || EXAM_PHASES[0]
  const workflowLabel = i18n.language?.startsWith('en') ? 'Exam workflow' : 'امتحانی مراحل'
  const activePhaseLabel = t(`exam.phase.${activePhase.id}`)
  const isRtl = i18n.dir() === 'rtl'

  const items = EXAM_WORKFLOW_STEPS.map((s) => {
    const isEnabled = enabledSteps ? enabledSteps[s] !== false : true
    const isDone = Boolean(doneSteps?.[s])
    return {
      id: s,
      disabled: !isEnabled,
      title: !isEnabled ? t('exam.stepLockedHint') : undefined,
      label: (
        <span
          className={[
            'exam-phases__tab-label',
            isDone && isEnabled ? 'exam-phases__tab-label--done' : '',
            !isEnabled ? 'exam-phases__tab-label--locked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title={!isEnabled ? t('exam.stepLockedHint') : stepLabels[s]?.label || s}
        >
          <span className="exam-phases__num">{stepLabels[s]?.num || ''}</span>
          <span className="exam-phases__label">{stepLabels[s]?.label || s}</span>
        </span>
      ),
    }
  })

  useEffect(() => {
    const node = scrollerRef.current
    if (!node) return
    const active = node.querySelector('[aria-selected="true"], .app-tabs__btn--active, button.active, .app-tabs__tab.is-active')
    if (active?.scrollIntoView) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [step])

  function scrollTabs(direction) {
    const node = scrollerRef.current
    if (!node) return
    const amount = direction === 'left' ? -260 : 260
    node.scrollBy({ left: isRtl ? -amount : amount, behavior: 'smooth' })
  }

  function handleChange(next) {
    if (enabledSteps && enabledSteps[next] === false) return
    onStepChange(next)
  }

  return (
    <div className="exam-phases exam-phases--tabs">
      <button
        type="button"
        className="exam-phases__arrow exam-phases__arrow--left"
        onClick={() => scrollTabs('left')}
        aria-label={isRtl ? 'آگے' : 'Previous'}
      >
        ‹
      </button>
      <div ref={scrollerRef} className="exam-phases__tabs-scroll">
        <AppTabs
          items={items}
          value={step}
          onChange={handleChange}
          variant="segment"
          size="sm"
          ariaLabel={`${workflowLabel} — ${activePhaseLabel}`}
          lang={i18n.language}
          className="exam-phases__app-tabs"
        />
      </div>
      <button
        type="button"
        className="exam-phases__arrow exam-phases__arrow--right"
        onClick={() => scrollTabs('right')}
        aria-label={isRtl ? 'پیچھے' : 'Next'}
      >
        ›
      </button>
    </div>
  )
}
