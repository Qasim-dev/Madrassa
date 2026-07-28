import { api } from './baseApi'

export const recycleBinApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getRecycleBin: builder.query({
      query: (params) => ({ url: 'recycle-bin', params: { sync: '1', ...params } }),
      providesTags: ['RecycleBin'],
    }),
    getRecycleBinItem: builder.query({
      query: (id) => `recycle-bin/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'RecycleBin', id }],
    }),
    restoreRecycleItem: builder.mutation({
      query: (body) => ({ url: 'recycle-bin/restore', method: 'POST', body }),
      invalidatesTags: ['RecycleBin', 'Student', 'Teacher', 'Fee', 'Dashboard'],
    }),
    bulkRestoreRecycle: builder.mutation({
      query: (body) => ({ url: 'recycle-bin/bulk-restore', method: 'POST', body }),
      invalidatesTags: ['RecycleBin', 'Student', 'Teacher', 'Fee', 'Dashboard'],
    }),
    permanentDeleteRecycle: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `recycle-bin/permanent/${id}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RecycleBin', 'Student', 'Teacher', 'Fee', 'Dashboard'],
    }),
    bulkPermanentDeleteRecycle: builder.mutation({
      query: (body) => ({ url: 'recycle-bin/bulk-permanent', method: 'POST', body }),
      invalidatesTags: ['RecycleBin', 'Student', 'Teacher', 'Fee', 'Dashboard'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetRecycleBinQuery,
  useGetRecycleBinItemQuery,
  useRestoreRecycleItemMutation,
  useBulkRestoreRecycleMutation,
  usePermanentDeleteRecycleMutation,
  useBulkPermanentDeleteRecycleMutation,
} = api
