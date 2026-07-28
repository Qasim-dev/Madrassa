import { api } from './baseApi'

export const feesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFeeItems: builder.query({
      query: (params) => ({ url: 'fees/items', params }),
      providesTags: ['Fee'],
    }),
    createFeeItem: builder.mutation({
      query: (body) => ({ url: 'fees/items', method: 'POST', body }),
      invalidatesTags: ['Fee'],
    }),
    updateFeeItem: builder.mutation({
      query: ({ id, ...body }) => ({ url: `fees/items/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Fee'],
    }),
    deleteFeeItem: builder.mutation({
      query: (id) => ({ url: `fees/items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Fee'],
    }),
    getFeeBalances: builder.query({
      query: (params) => ({
        url: 'fees/balances',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Fee'],
    }),
    getStudentFeeBalance: builder.query({
      query: (studentId) => `fees/balances/student/${studentId}`,
      providesTags: ['Fee'],
    }),
    upsertStudentFeeDue: builder.mutation({
      query: (body) => ({ url: 'fees/balances/upsert-due', method: 'POST', body }),
      invalidatesTags: ['Fee', 'Dashboard'],
    }),
    applyFeeItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `fees/items/${id}/apply`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Fee', 'Dashboard'],
    }),
    collectFeeBalance: builder.mutation({
      query: ({ id, body }) => ({
        url: `fees/balances/${id}/collect`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Finance', 'Fee', 'Dashboard'],
    }),
    applyFeeMaafi: builder.mutation({
      query: ({ id, ...body }) => ({ url: `fees/balances/${id}/maafi`, method: 'POST', body }),
      invalidatesTags: ['Fee', 'Dashboard'],
    }),
    applyFeeBalanceToDue: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `fees/balances/${id}/apply-balance`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Fee', 'Dashboard'],
    }),
    getFeeAuditLog: builder.query({
      query: (params) => ({ url: 'fees/audit', params }),
      providesTags: ['Fee'],
    }),
    deleteFeeBalance: builder.mutation({
      query: ({ id, reason, sessionId }) => ({
        url: `fees/balances/${id}/delete`,
        method: 'POST',
        body: { reason, ...(sessionId ? { sessionId } : {}) },
      }),
      invalidatesTags: ['Fee', 'Dashboard'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetFeeItemsQuery,
  useCreateFeeItemMutation,
  useUpdateFeeItemMutation,
  useDeleteFeeItemMutation,
  useGetFeeBalancesQuery,
  useGetStudentFeeBalanceQuery,
  useUpsertStudentFeeDueMutation,
  useApplyFeeItemMutation,
  useCollectFeeBalanceMutation,
  useApplyFeeMaafiMutation,
  useApplyFeeBalanceToDueMutation,
  useGetFeeAuditLogQuery,
  useDeleteFeeBalanceMutation
} = api
