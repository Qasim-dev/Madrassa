import { api } from './baseApi'

export const attendanceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStudentAttendance: builder.query({
      query: (params) => ({ url: 'attendance/students', params }),
      providesTags: ['Attendance'],
    }),
    saveStudentAttendance: builder.mutation({
      query: (body) => ({ url: 'attendance/students', method: 'POST', body }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    getTeacherAttendance: builder.query({
      query: (params) => ({ url: 'attendance/teachers', params }),
      providesTags: ['Attendance'],
    }),
    saveTeacherAttendance: builder.mutation({
      query: (body) => ({ url: 'attendance/teachers', method: 'POST', body }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    getAttendanceCategories: builder.query({
      query: () => ({ url: 'attendance/categories' }),
      providesTags: ['Attendance'],
    }),
    getAttendanceSlots: builder.query({
      query: (params) => ({ url: 'attendance/slots', params }),
      providesTags: ['Attendance'],
    }),
    getAttendanceRoster: builder.query({
      query: (params) => ({ url: 'attendance/roster', params }),
      providesTags: ['Attendance'],
    }),
    getAttendanceTimetableSlots: builder.query({
      query: (params) => ({ url: 'attendance/timetable-slots', params }),
      providesTags: ['Attendance', 'Tartibat'],
    }),
    getAttendanceContext: builder.query({
      query: (params) => ({ url: 'attendance/context', params }),
      providesTags: ['Attendance', 'Tartibat'],
    }),
    getStudentAttendanceReport: builder.query({
      query: ({ studentId, ...params }) => ({
        url: `attendance/reports/student/${studentId}`,
        params,
      }),
      providesTags: ['Attendance'],
    }),
    getStudentAttendanceRecords: builder.query({
      query: ({ studentId, ...params }) => ({
        url: `attendance/reports/student/${studentId}/records`,
        params,
      }),
      providesTags: ['Attendance'],
    }),
    getAttendanceDaySummary: builder.query({
      query: (params) => ({ url: 'attendance/day-summary', params }),
      providesTags: ['Attendance'],
    }),
    getTeacherAttendanceDaySummary: builder.query({
      query: (params) => ({ url: 'attendance/teacher-day-summary', params }),
      providesTags: ['Attendance'],
    }),
    getTeacherAttendanceRecords: builder.query({
      query: ({ teacherId, ...params }) => ({
        url: `attendance/reports/teacher/${teacherId}/records`,
        params,
      }),
      providesTags: ['Attendance'],
    }),
    getTeacherAttendanceSummary: builder.query({
      query: ({ teacherId, ...params }) => ({
        url: `attendance/reports/teacher/${teacherId}/summary`,
        params,
      }),
      providesTags: ['Attendance'],
    })
  }),
  overrideExisting: false,
})

export const {
  useGetStudentAttendanceQuery,
  useSaveStudentAttendanceMutation,
  useGetTeacherAttendanceQuery,
  useSaveTeacherAttendanceMutation,
  useGetAttendanceCategoriesQuery,
  useGetAttendanceSlotsQuery,
  useGetAttendanceRosterQuery,
  useGetAttendanceTimetableSlotsQuery,
  useGetAttendanceContextQuery,
  useGetStudentAttendanceReportQuery,
  useGetStudentAttendanceRecordsQuery,
  useGetAttendanceDaySummaryQuery,
  useGetTeacherAttendanceDaySummaryQuery,
  useGetTeacherAttendanceRecordsQuery,
  useGetTeacherAttendanceSummaryQuery
} = api
