import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeading from '../components/PageHeading'
import {
  useGetUsersQuery,
  useCreateUserMutation,
  usePatchUserMutation,
  useDeleteUserMutation,
} from '../services/api'
import { AppInput, AppSelect } from '../components/ui'
import DataTable from '../components/DataTable'
import { loc } from '../shared/localized'

export default function UsersPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const { data: users = [], isLoading, refetch } = useGetUsersQuery()
  const [createUser, { isLoading: creating }] = useCreateUserMutation()
  const [patchUser] = usePatchUserMutation()
  const [deleteUser] = useDeleteUserMutation()
  const [form, setForm] = useState({ email: '', password: '', role: 'staff' })
  const [error, setError] = useState('')

  async function onCreate(e) {
    e.preventDefault()
    setError('')
    try {
      await createUser(form).unwrap()
      setForm({ email: '', password: '', role: 'staff' })
      refetch()
    } catch (err) {
      setError(err?.data?.message || (en ? 'Create failed' : 'بنانے میں ناکامی'))
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
            onClick={() => {
              if (window.confirm(en ? 'Delete user?' : 'صارف حذف کریں؟')) {
                deleteUser(row._id || row.id)
              }
            }}
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

      <form className="content-panel p-3 mb-3" onSubmit={onCreate}>
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label small" htmlFor="u-email">
              Email
            </label>
            <AppInput
              id="u-email"
              type="email"
              latin
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small" htmlFor="u-pass">
              {en ? 'Temp password' : 'عارضی پاس ورڈ'}
            </label>
            <AppInput
              id="u-pass"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small" htmlFor="u-role">
              Role
            </label>
            <AppSelect
              id="u-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </div>
          <div className="col-md-3">
            <button type="submit" className="btn btn-success" disabled={creating}>
              {creating ? t('common.loading') : en ? 'Add user' : 'صارف شامل کریں'}
            </button>
          </div>
        </div>
        {error ? (
          <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">
            {error}
          </div>
        ) : null}
      </form>

      <DataTable isLoading={isLoading} columns={columns} rows={users} />
    </div>
  )
}
