import { statusLabel } from '../../shared/examEnums'

const colors = {
  draft: 'bg-slate-100 text-slate-700',
  configured: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  marks_entry: 'bg-amber-100 text-amber-800',
  processing: 'bg-purple-100 text-purple-700',
  published: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-200 text-gray-600',
}

export default function ExamStatusBadge({ status, lng }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.draft}`}>
      {statusLabel(status, lng)}
    </span>
  )
}
