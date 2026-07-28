import { api } from './baseApi'

export const studentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query({
      query: (params) => ({ url: 'students', params }),
      providesTags: ['Student'],
    }),
    getNextStudentId: builder.query({
      query: (params) => ({ url: 'students/next-student-id', params }),
      providesTags: ['Student'],
    }),
    getStudent: builder.query({
      query: (id) => `students/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Student', id }],
    }),
    createStudent: builder.mutation({
      query: (body) => ({ url: 'students', method: 'POST', body }),
      invalidatesTags: ['Student', 'Dashboard'],
    }),
    updateStudent: builder.mutation({
      query: ({ id, ...body }) => ({ url: `students/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Student', 'Dashboard'],
    }),
    deleteStudent: builder.mutation({
      query: (id) => ({ url: `students/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Student', 'Dashboard'],
    }),
    importStudentsExcel: builder.mutation({
      query: (formData) => ({
        url: 'students/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Student', 'Dashboard'],
    }),
    uploadStudentPhoto: builder.mutation({
      query: ({ id, formData }) => ({
        url: `students/${id}/photo`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Student'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetStudentsQuery,
  useGetNextStudentIdQuery,
  useGetStudentQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useImportStudentsExcelMutation,
  useUploadStudentPhotoMutation
} = api
