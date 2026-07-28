import { api } from './baseApi'

export const gradesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getGrades: builder.query({
      query: (params) => ({
        url: 'grades',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Grade'],
    }),
    createGrade: builder.mutation({
      query: (body) => ({ url: 'grades', method: 'POST', body }),
      invalidatesTags: ['Grade', 'Dashboard'],
    }),
    updateGrade: builder.mutation({
      query: ({ id, ...body }) => ({ url: `grades/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Grade'],
    }),
    deleteGrade: builder.mutation({
      query: (id) => ({ url: `grades/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Grade'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetGradesQuery,
  useCreateGradeMutation,
  useUpdateGradeMutation,
  useDeleteGradeMutation
} = api
