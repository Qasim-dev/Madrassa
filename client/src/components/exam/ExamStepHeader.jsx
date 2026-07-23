/** Consistent step title + optional hint + action toolbar */
export default function ExamStepHeader({ title, hint, actions, className = '' }) {
  return (
    <header className={`exam-step-header ${className}`.trim()}>
      <div className="exam-step-header__main">
        <h2 className="exam-step-header__title">{title}</h2>
        {hint ? <p className="exam-step-header__hint">{hint}</p> : null}
      </div>
      {actions ? <div className="exam-step-header__actions">{actions}</div> : null}
    </header>
  )
}
