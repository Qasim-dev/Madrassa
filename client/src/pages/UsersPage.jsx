import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeading from '../components/PageHeading'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  useGetUsersQuery,
  useCreateUserMutation,
  usePatchUserMutation,
  useDeleteUserMutation,
} from '../services/api'
import { AppInput, AppSelect, FormField, FormRow } from '../components/ui'
import DataTable from '../components/DataTable'
import { loc } from '../shared/localized'
import {
  useFormValidation,
  compose,
  required,
  email,
  passwordMin,
} from '../shared/validation'

const FIELD_IDS = { email: 'u-email', password: 'u-pass' }

export default function UsersPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const { data: users = [], isLoading, refetch } = useGetUsersQuery()
  const [createUser, { isLoading: creating }] = useCreateUserMutation()
  const [patchUser] = usePatchUserMutation()
  const [deleteUser] = useDeleteUserMutation()
  const [form, setForm] = useState({ email: '', password: '', role: 'staff' })
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const schema = useMemo(
    () => ({
      email: compose(required('validation.emailRequired'), email()),
      password: compose(required('validation.passwordRequired'), passwordMin(8)),
    }),
    []
  )
  const {
    errors: fieldErrors,
    onBlurField,
    revalidateIfError,
    validateAll,
    focusInvalid,
    applyApiError,
    setErrors,
  } = useFormValidation({
    schema,
    t,
    fieldIds: FIELD_IDS,
    order: ['email', 'password'],
  })

  async function onCreate(e) {
    e.preventDefault()
    setFormError('')
    const nextErrors = validateAll(form)
    if (Object.keys(nextErrors).length) {
      focusInvalid(nextErrors)
      return
    }
    try {
      await createUser(form).unwrap()
      setForm({ email: '', password: '', role: 'staff' })
      setErrors({})
      refetch()
    } catch (err) {
      const apiMsg = applyApiError(err)
      setFormError(apiMsg || err?.data?.message || (en ? 'Could not create user.' : 'صارف نہیں بن سکا۔'))
    }
  }

  const columns = [
    { key: 'email', header: 'Email', cell: (row) => row.email },
    {
      key: 'name',
      header: en ? 'Name' : 'نام',
      cell: (row) => loc(row.name, lng) || '—',
    },
    { key: 'role', header: 'Role', cell: (row) => row.role },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="d-flex gap-1 justify-content-center">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              patchUser({
                id: row._id || row.id,
                role: row.role === 'admin' ? 'staff' : 'admin',
              })
            }
          >
            {row.role === 'admin' ? '→ staff' : '→ admin'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setDeleteTarget(row)}
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeading subtitle={en ? 'Invite staff with limited access' : 'محدود رسائی والے عملے کو شامل کریں'} />

      <form className="content-panel p-3 mb-3" onSubmit={onCreate} noValidate>
        <FormRow>
          <FormField label="Email" htmlFor="u-email" col={4} required error={fieldErrors.email}>
            <AppInput
              id="u-email"
              type="email"
              latin
              value={form.email}
              onChange={(e) => {
                const next = { ...form, email: e.target.value }
                setForm(next)
                revalidateIfError('email', next)
              }}
              onBlur={() => onBlurField('email', form)}
            />
          </FormField>
          <FormField
            label={en ? 'Temp password' : 'عارضی پاس ورڈ'}
            htmlFor="u-pass"
            col={3}
            required
            error={fieldErrors.password}
          >
            <AppInput
              id="u-pass"
              type="password"
              value={form.password}
              onChange={(e) => {
                const next = { ...form, password: e.target.value }
                setForm(next)
                revalidateIfError('password', next)
              }}
              onBlur={() => onBlurField('password', form)}
            />
          </FormField>
          <FormField label="Role" htmlFor="u-role" col={2}>
            <AppSelect
              id="u-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </FormField>
          <div className="app-form-col app-form-col--3 d-flex align-items-end">
            <button type="submit" className="btn btn-success w-100" disabled={creating}>
              {creating
                ? t('validation.formSaving')
                : en
                  ? 'Create user'
                  : 'صارف بنائیں'}
            </button>
          </div>
        </FormRow>
        {formError ? (
          <p className="text-danger small mt-2 mb-0" role="alert">
            {formError}
          </p>
        ) : null}
      </form>

      <DataTable columns={columns} rows={users} loading={isLoading} rowKey={(r) => r._id || r.id} />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={t('common.confirmDeleteTitle')}
        message={en ? 'Delete user?' : 'صارف حذف کریں؟'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          await deleteUser(deleteTarget._id || deleteTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}
