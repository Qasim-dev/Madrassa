import { api } from './baseApi'

export const financeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFinanceOverview: builder.query({
      query: (params) => ({
        url: 'finance/overview',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Finance'],
    }),
    getFinanceAccounts: builder.query({
      query: () => 'finance/accounts',
      providesTags: ['Finance'],
    }),
    getTransactions: builder.query({
      query: (params) => ({
        url: 'finance/transactions',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Finance'],
    }),
    createTransaction: builder.mutation({
      query: (body) => ({ url: 'finance/transactions', method: 'POST', body }),
      invalidatesTags: ['Finance', 'Dashboard', 'Fee', 'TeacherSalary'],
    }),
    updateTransaction: builder.mutation({
      query: ({ id, body }) => ({ url: `finance/transactions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Finance', 'Dashboard', 'Fee', 'TeacherSalary'],
    }),
    deleteTransaction: builder.mutation({
      query: (id) => ({ url: `finance/transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Finance', 'Dashboard', 'Fee', 'TeacherSalary'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetFinanceOverviewQuery,
  useGetFinanceAccountsQuery,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation
} = api
