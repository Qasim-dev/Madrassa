import { api } from './baseApi'

export const studentActivitiesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getActivityCategories: builder.query({
      query: (params) => ({ url: 'student-activities/categories', params }),
      providesTags: ['StudentActivity'],
    }),
    createActivityCategory: builder.mutation({
      query: (body) => ({ url: 'student-activities/categories', method: 'POST', body }),
      invalidatesTags: ['StudentActivity'],
    }),
    patchActivityCategory: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `student-activities/categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['StudentActivity'],
    }),
    reorderActivityCategories: builder.mutation({
      query: (body) => ({ url: 'student-activities/categories/reorder', method: 'POST', body }),
      invalidatesTags: ['StudentActivity'],
    }),
    deleteActivityCategory: builder.mutation({
      query: ({ id, hard }) => ({
        url: `student-activities/categories/${id}`,
        method: 'DELETE',
        params: hard ? { hard: 1 } : undefined,
      }),
      invalidatesTags: ['StudentActivity'],
    }),
    getDailyActivities: builder.query({
      query: (params) => ({ url: 'student-activities/daily', params }),
      providesTags: ['StudentActivity'],
    }),
    bulkSaveDailyActivities: builder.mutation({
      query: (body) => ({ url: 'student-activities/daily/bulk', method: 'POST', body }),
      invalidatesTags: ['StudentActivity'],
    }),
    copyDailyActivities: builder.mutation({
      query: (body) => ({ url: 'student-activities/daily/copy', method: 'POST', body }),
      invalidatesTags: ['StudentActivity'],
    }),
    getStudentActivityHistory: builder.query({
      query: (params) => ({ url: 'student-activities/history', params }),
      providesTags: ['StudentActivity'],
    }),
    getActivityAnalyticsSummary: builder.query({
      query: (params) => ({ url: 'student-activities/analytics/summary', params }),
      providesTags: ['StudentActivity'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetActivityCategoriesQuery,
  useCreateActivityCategoryMutation,
  usePatchActivityCategoryMutation,
  useReorderActivityCategoriesMutation,
  useDeleteActivityCategoryMutation,
  useGetDailyActivitiesQuery,
  useBulkSaveDailyActivitiesMutation,
  useCopyDailyActivitiesMutation,
  useGetStudentActivityHistoryQuery,
  useGetActivityAnalyticsSummaryQuery
} = api
