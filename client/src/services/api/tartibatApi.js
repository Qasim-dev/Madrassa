import { api } from './baseApi'

export const tartibatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSessions: builder.query({
      query: () => 'tartibat/sessions',
      providesTags: ['Tartibat'],
    }),
    createSession: builder.mutation({
      query: (body) => ({ url: 'tartibat/sessions', method: 'POST', body }),
      invalidatesTags: ['Tartibat'],
    }),
    updateSession: builder.mutation({
      query: ({ id, ...body }) => ({ url: `tartibat/sessions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Tartibat'],
    }),
    getSessionSummary: builder.query({
      query: (id) => `tartibat/sessions/${id}/summary`,
    }),
    deleteSession: builder.mutation({
      query: (id) => ({ url: `tartibat/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tartibat'],
    }),
    getSubjects: builder.query({
      query: (params) => ({
        url: 'tartibat/subjects',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Tartibat'],
    }),
    createSubject: builder.mutation({
      query: (body) => ({ url: 'tartibat/subjects', method: 'POST', body }),
      invalidatesTags: ['Tartibat'],
    }),
    updateSubject: builder.mutation({
      query: ({ id, ...body }) => ({ url: `tartibat/subjects/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Tartibat'],
    }),
    deleteSubject: builder.mutation({
      query: (id) => ({ url: `tartibat/subjects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tartibat'],
    }),
    getDarajat: builder.query({
      query: (params) => ({ url: 'tartibat/darajat', params }),
      providesTags: ['Tartibat'],
    }),
    createDarjah: builder.mutation({
      query: (body) => ({ url: 'tartibat/darajat', method: 'POST', body }),
      invalidatesTags: ['Tartibat'],
    }),
    updateDarjah: builder.mutation({
      query: ({ id, ...body }) => ({ url: `tartibat/darajat/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Tartibat'],
    }),
    updateDarjahSubjects: builder.mutation({
      query: ({ id, subjectIds }) => ({ url: `tartibat/darajat/${id}/subjects`, method: 'PATCH', body: { subjectIds } }),
      invalidatesTags: ['Tartibat'],
    }),
    deleteDarjah: builder.mutation({
      query: (id) => ({ url: `tartibat/darajat/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tartibat'],
    }),
    getSubjectBooks: builder.query({
      query: (params) => ({ url: 'tartibat/books', params }),
      providesTags: ['Tartibat'],
    }),
    createSubjectBook: builder.mutation({
      query: (body) => ({ url: 'tartibat/books', method: 'POST', body }),
      invalidatesTags: ['Tartibat'],
    }),
    updateSubjectBook: builder.mutation({
      query: ({ id, ...body }) => ({ url: `tartibat/books/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Tartibat'],
    }),
    deleteSubjectBook: builder.mutation({
      query: (id) => ({ url: `tartibat/books/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tartibat'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useGetSessionSummaryQuery,
  useDeleteSessionMutation,
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetDarajatQuery,
  useCreateDarjahMutation,
  useUpdateDarjahMutation,
  useUpdateDarjahSubjectsMutation,
  useDeleteDarjahMutation,
  useGetSubjectBooksQuery,
  useCreateSubjectBookMutation,
  useUpdateSubjectBookMutation,
  useDeleteSubjectBookMutation
} = api
