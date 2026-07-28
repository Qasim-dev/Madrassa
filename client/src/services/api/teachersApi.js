import { api } from './baseApi'

export const teachersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTeachers: builder.query({
      query: (params) => ({
        url: 'teachers',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Teacher'],
    }),
    getTeacherSalaries: builder.query({
      query: (teacherId) => ({
        url: 'teacher-salaries',
        params: { teacherId },
      }),
      providesTags: ['TeacherSalary'],
    }),
    getTeacherSalaryPicklist: builder.query({
      query: (params) => ({
        url: 'teacher-salaries/picklist',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['TeacherSalary'],
    }),
    getTeacherSalariesOverview: builder.query({
      query: () => 'teacher-salaries/overview',
      providesTags: ['TeacherSalary'],
    }),
    createTeacherSalary: builder.mutation({
      query: (body) => ({ url: 'teacher-salaries', method: 'POST', body }),
      invalidatesTags: ['TeacherSalary'],
    }),
    updateTeacherSalary: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `teacher-salaries/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['TeacherSalary'],
    }),
    deleteTeacherSalary: builder.mutation({
      query: (id) => ({ url: `teacher-salaries/${id}`, method: 'DELETE' }),
      invalidatesTags: ['TeacherSalary'],
    }),
    payTeacherSalarySlip: builder.mutation({
      query: ({ id, body }) => ({
        url: `teacher-salaries/${id}/pay`,
        method: 'POST',
        body: body || {},
      }),
      invalidatesTags: ['Finance', 'TeacherSalary', 'Dashboard'],
    }),
    getTeacher: builder.query({
      query: (id) => `teachers/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Teacher', id }],
    }),
    createTeacher: builder.mutation({
      query: (body) => ({ url: 'teachers', method: 'POST', body }),
      invalidatesTags: ['Teacher', 'Dashboard'],
    }),
    updateTeacher: builder.mutation({
      query: ({ id, ...body }) => ({ url: `teachers/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Teacher'],
    }),
    deleteTeacher: builder.mutation({
      query: (id) => ({ url: `teachers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Teacher', 'Dashboard'],
    }),
    importTeachersExcel: builder.mutation({
      query: (formData) => ({
        url: 'teachers/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Teacher', 'Dashboard'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetTeachersQuery,
  useGetTeacherSalariesQuery,
  useGetTeacherSalaryPicklistQuery,
  useGetTeacherSalariesOverviewQuery,
  useCreateTeacherSalaryMutation,
  useUpdateTeacherSalaryMutation,
  useDeleteTeacherSalaryMutation,
  usePayTeacherSalarySlipMutation,
  useGetTeacherQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useImportTeachersExcelMutation
} = api
