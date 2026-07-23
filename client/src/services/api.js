import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout } from '../features/auth/authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  },
})

/** HTTP status from RTK errors (incl. PARSING_ERROR.originalStatus). */
function httpStatus(error) {
  if (!error) return null
  if (typeof error.status === 'number') return error.status
  if (typeof error.originalStatus === 'number') return error.originalStatus
  if (error.status === '401' || error.status === 401) return 401
  return null
}

let loggingOut = false

/** Log out when an authenticated request returns 401 (expired / invalid token). */
const baseQuery = async (args, apiRTK, extraOptions) => {
  const result = await rawBaseQuery(args, apiRTK, extraOptions)
  if (httpStatus(result.error) === 401) {
    const token = apiRTK.getState().auth.token
    const url = typeof args === 'string' ? args : args?.url || ''
    const isPublicAuth = /auth\/(login|register)/.test(url)
    if (token && !isPublicAuth && !loggingOut) {
      loggingOut = true
      apiRTK.dispatch(logout())
      // Defer reset so we don't clear in-flight request bookkeeping mid-handler.
      queueMicrotask(() => {
        try {
          apiRTK.dispatch(api.util.resetApiState())
        } finally {
          loggingOut = false
        }
      })
    }
  }
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Dashboard',
    'Student',
    'Teacher',
    'Grade',
    'Attendance',
    'Fee',
    'Finance',
    'Inventory',
    'Settings',
    'Tartibat',
    'TeacherSalary',
    'Exam',
    'BookReading',
    'Library',
    'Speech',
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
    }),
    register: builder.mutation({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
    }),
    getMe: builder.query({
      query: () => 'auth/me',
    }),
    patchMe: builder.mutation({
      query: (body) => ({ url: 'auth/me', method: 'PATCH', body }),
    }),
    patchTenant: builder.mutation({
      query: (body) => ({ url: 'auth/tenant', method: 'PATCH', body }),
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: 'auth/change-password', method: 'POST', body }),
    }),
    getDashboardStats: builder.query({
      query: (params) => ({
        url: 'dashboard/stats',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Dashboard'],
    }),
    getSearchSuggestions: builder.query({
      query: (params) => ({ url: 'search/suggest', params }),
    }),
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
    }),
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
    }),
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
    }),
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
    }),
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
    }),
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
    }),
    getInventoryStats: builder.query({
      query: (params) => ({
        url: 'inventory/stats',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Inventory'],
    }),
    getInventoryItems: builder.query({
      query: (params) => ({
        url: 'inventory/items',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Inventory'],
    }),
    createInventoryItem: builder.mutation({
      query: (body) => ({ url: 'inventory/items', method: 'POST', body }),
      invalidatesTags: ['Inventory', 'Dashboard'],
    }),
    updateInventoryItem: builder.mutation({
      query: ({ id, ...body }) => ({ url: `inventory/items/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Inventory', 'Dashboard'],
    }),
    deleteInventoryItem: builder.mutation({
      query: (id) => ({ url: `inventory/items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Inventory', 'Dashboard'],
    }),
    getInventoryMovements: builder.query({
      query: (params) => ({
        url: 'inventory/movements',
        ...(params && Object.keys(params).length ? { params } : {}),
      }),
      providesTags: ['Inventory'],
    }),
    createInventoryMovement: builder.mutation({
      query: (body) => ({ url: 'inventory/movements', method: 'POST', body }),
      invalidatesTags: ['Inventory', 'Finance', 'Dashboard'],
    }),
    getLibraryStats: builder.query({
      query: (params) => ({ url: 'library/books/stats', params }),
      providesTags: ['Library'],
    }),
    getLibraryBooks: builder.query({
      query: (params) => ({ url: 'library/books', params }),
      providesTags: ['Library'],
    }),
    createLibraryBook: builder.mutation({
      query: (body) => ({ url: 'library/books', method: 'POST', body }),
      invalidatesTags: ['Library'],
    }),
    updateLibraryBook: builder.mutation({
      query: ({ id, ...body }) => ({ url: `library/books/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Library'],
    }),
    deleteLibraryBook: builder.mutation({
      query: (id) => ({ url: `library/books/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Library'],
    }),
    getLibraryTransactions: builder.query({
      query: (params) => ({ url: 'library/transactions', params }),
      providesTags: ['Library'],
    }),
    issueLibraryBook: builder.mutation({
      query: (body) => ({ url: 'library/transactions/issue', method: 'POST', body }),
      invalidatesTags: ['Library'],
    }),
    returnLibraryBook: builder.mutation({
      query: ({ id, ...body }) => ({ url: `library/transactions/${id}/return`, method: 'POST', body }),
      invalidatesTags: ['Library'],
    }),
    getSpeeches: builder.query({
      query: (params) => ({ url: 'speeches', params }),
      providesTags: ['Speech'],
    }),
    getSpeech: builder.query({
      query: (id) => `speeches/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Speech', id }],
    }),
    createSpeech: builder.mutation({
      query: (body) => ({
        url: 'speeches',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Speech'],
    }),
    updateSpeech: builder.mutation({
      query: ({ id, body }) => ({
        url: `speeches/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Speech'],
    }),
    deleteSpeech: builder.mutation({
      query: (id) => ({ url: `speeches/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Speech'],
    }),
    getSettings: builder.query({
      query: () => 'settings',
      providesTags: ['Settings'],
    }),
    patchSettings: builder.mutation({
      query: (body) => ({ url: 'settings', method: 'PATCH', body }),
      invalidatesTags: ['Settings'],
    }),
    uploadTenantLogo: builder.mutation({
      query: (formData) => ({
        url: 'settings/logo',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Settings'],
    }),
    getBooks: builder.query({
      query: () => 'settings/books',
      providesTags: ['Settings'],
    }),
    createBook: builder.mutation({
      query: (body) => ({ url: 'settings/books', method: 'POST', body }),
      invalidatesTags: ['Settings'],
    }),
    updateBook: builder.mutation({
      query: ({ id, ...body }) => ({ url: `settings/books/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Settings'],
    }),
    deleteBook: builder.mutation({
      query: (id) => ({ url: `settings/books/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Settings'],
    }),

    // Tartibat module
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
    }),

    // Timetable
    getTimeSlots: builder.query({
      query: (params) => ({ url: 'timetable/slots', params }),
      providesTags: ['Tartibat'],
    }),
    createTimeSlot: builder.mutation({
      query: (body) => ({ url: 'timetable/slots', method: 'POST', body }),
      invalidatesTags: ['Tartibat'],
    }),
    updateTimeSlot: builder.mutation({
      query: ({ id, ...body }) => ({ url: `timetable/slots/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Tartibat'],
    }),
    deleteTimeSlot: builder.mutation({
      query: (id) => ({ url: `timetable/slots/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tartibat'],
    }),
    getTimetableEntries: builder.query({
      query: (params) => ({ url: 'timetable/entries', params }),
      providesTags: ['Tartibat'],
    }),
    createTimetableEntry: builder.mutation({
      query: (body) => ({ url: 'timetable/entries', method: 'POST', body }),
      invalidatesTags: ['Tartibat'],
    }),
    updateTimetableEntry: builder.mutation({
      query: ({ id, ...body }) => ({ url: `timetable/entries/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Tartibat'],
    }),
    deleteTimetableEntry: builder.mutation({
      query: (id) => ({ url: `timetable/entries/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tartibat'],
    }),

    // Geo (dynamic countries/states/cities)
    getGeoCountries: builder.query({
      query: () => 'geo/countries',
      providesTags: ['Settings'],
    }),
    getGeoStates: builder.query({
      query: (params) => ({ url: 'geo/states', params }),
      providesTags: ['Settings'],
    }),
    getGeoCities: builder.query({
      query: (params) => ({ url: 'geo/cities', params }),
      providesTags: ['Settings'],
    }),

    // ─── Examination Module ───────────────────────────────────────
    getExamDashboard: builder.query({
      query: (params) => ({ url: 'exams/dashboard', params }),
      providesTags: ['Exam'],
    }),
    getExamResultMatrix: builder.query({
      query: ({ examId, ...params }) => ({
        url: `exams/${examId}/results`,
        params: { ...params, matrix: '1' },
      }),
      providesTags: ['Exam'],
    }),
    importExamMarks: builder.mutation({
      query: ({ examId, formData, sessionId }) => ({
        url: `exams/${examId}/marks/import`,
        method: 'POST',
        body: formData,
        params: sessionId ? { sessionId } : undefined,
      }),
      invalidatesTags: ['Exam'],
    }),
    getExams: builder.query({
      query: (params) => ({ url: 'exams', params }),
      providesTags: ['Exam'],
    }),
    getExam: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}`, params }),
      providesTags: (_r, _e, { examId }) => [{ type: 'Exam', id: examId }],
    }),
    createExam: builder.mutation({
      query: (body) => ({ url: 'exams', method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    updateExam: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}`, method: 'PUT', body }),
      invalidatesTags: ['Exam'],
    }),
    deleteExam: builder.mutation({
      query: ({ examId, reason, ...params }) => ({
        url: `exams/${examId}/delete`,
        method: 'POST',
        body: { reason },
        params,
      }),
      invalidatesTags: ['Exam'],
    }),
    getExamClasses: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}/classes`, params }),
      providesTags: ['Exam'],
    }),
    addExamClasses: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/classes`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    removeExamClass: builder.mutation({
      query: ({ examId, darjahId, ...params }) => ({
        url: `exams/${examId}/classes/${darjahId}`,
        method: 'DELETE',
        params,
      }),
      invalidatesTags: ['Exam'],
    }),
    getExamSubjects: builder.query({
      query: ({ examId, darjahId, ...params }) => ({
        url: `exams/${examId}/classes/${darjahId}/subjects`,
        params,
      }),
      providesTags: ['Exam'],
    }),
    saveExamSubjects: builder.mutation({
      query: ({ examId, darjahId, ...body }) => ({
        url: `exams/${examId}/classes/${darjahId}/subjects`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),
    deleteExamSubject: builder.mutation({
      query: ({ examId, darjahId, mappingId, ...params }) => ({
        url: `exams/${examId}/classes/${darjahId}/subjects/${mappingId}`,
        method: 'DELETE',
        params,
      }),
      invalidatesTags: ['Exam'],
    }),
    getExamSnapshot: builder.query({
      query: ({ examId, darjahId, ...params }) => ({
        url: `exams/${examId}/classes/${darjahId}/snapshot`,
        params,
      }),
      providesTags: ['Exam'],
    }),
    saveExamRollNumbers: builder.mutation({
      query: ({ examId, darjahId, sessionId, ...body }) => ({
        url: `exams/${examId}/classes/${darjahId}/snapshot/rolls`,
        method: 'PATCH',
        body,
        params: sessionId ? { sessionId } : undefined,
      }),
      invalidatesTags: ['Exam'],
    }),
    generateExamSnapshot: builder.mutation({
      query: ({ examId, darjahId, ...params }) => ({
        url: `exams/${examId}/classes/${darjahId}/snapshot`,
        method: 'POST',
        params,
      }),
      invalidatesTags: ['Exam'],
    }),
    getExamSchedule: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}/schedule`, params }),
      providesTags: ['Exam'],
    }),
    saveExamSchedule: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/schedule`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    deleteExamSchedule: builder.mutation({
      query: ({ examId, scheduleId, ...params }) => ({
        url: `exams/${examId}/schedule/${scheduleId}`,
        method: 'DELETE',
        params,
      }),
      invalidatesTags: ['Exam'],
    }),
    updateExamSchedule: builder.mutation({
      query: ({ examId, scheduleId, ...body }) => ({
        url: `exams/${examId}/schedule/${scheduleId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),
    getExamAttendance: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}/attendance`, params }),
      providesTags: ['Exam'],
    }),
    saveExamAttendance: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/attendance`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    getExamMarks: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}/marks`, params }),
      providesTags: ['Exam'],
    }),
    saveExamMarks: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/marks`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    applyGraceMarks: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/marks/grace`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    unlockExamMarks: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/marks/unlock`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    processExamResults: builder.mutation({
      query: ({ examId, ...body }) => ({
        url: `exams/${examId}/process-results`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),
    getExamResults: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}/results`, params }),
      providesTags: ['Exam'],
    }),
    publishExamResults: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/publish`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    getExamAnalytics: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}/analytics`, params }),
      providesTags: ['Exam'],
    }),
    getExamAuditLog: builder.query({
      query: ({ examId, ...params }) => ({ url: `exams/${examId}/audit-log`, params }),
      providesTags: ['Exam'],
    }),
    unlockExamContainer: builder.mutation({
      query: ({ examId, ...body }) => ({ url: `exams/${examId}/unlock`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),

    // Book reading progress
    getMyBooksWithProgress: builder.query({
      query: (params) => ({ url: 'book-reading/my-books', params }),
      providesTags: ['BookReading', 'Tartibat'],
    }),
    getBookWithReadingProgress: builder.query({
      query: (bookId) => ({ url: `book-reading/books/${bookId}` }),
      providesTags: (_r, _e, bookId) => [{ type: 'BookReading', id: bookId }],
    }),
    getBookReadingRecords: builder.query({
      query: (params) => ({ url: 'book-reading', params }),
      serializeQueryArgs: ({ queryArgs }) => {
        const p = queryArgs || {}
        return [
          p.bookId,
          p.page,
          p.limit,
          p.search,
          p.sortBy,
          p.sortOrder,
          p.fromDate,
          p.toDate,
        ].join('|')
      },
      providesTags: (_r, _e, arg) => [
        { type: 'BookReading', id: `records-${arg?.bookId || 'all'}` },
      ],
    }),
    createBookReadingRecord: builder.mutation({
      query: (body) => ({ url: 'book-reading', method: 'POST', body }),
      invalidatesTags: (_r, _e, body) => [
        'BookReading',
        { type: 'BookReading', id: `records-${body?.bookId}` },
      ],
    }),
    updateBookReadingRecord: builder.mutation({
      query: ({ id, ...body }) => ({ url: `book-reading/${id}`, method: 'PUT', body }),
      invalidatesTags: ['BookReading'],
    }),
    deleteBookReadingRecord: builder.mutation({
      query: (id) => ({ url: `book-reading/${id}`, method: 'DELETE' }),
      invalidatesTags: ['BookReading'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  usePatchMeMutation,
  usePatchTenantMutation,
  useChangePasswordMutation,
  useGetDashboardStatsQuery,
  useLazyGetSearchSuggestionsQuery,
  useGetStudentsQuery,
  useGetStudentQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useUploadStudentPhotoMutation,
  useImportStudentsExcelMutation,
  useGetTeachersQuery,
  useGetTeacherQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useImportTeachersExcelMutation,
  useGetTeacherSalariesQuery,
  useGetTeacherSalaryPicklistQuery,
  useGetTeacherSalariesOverviewQuery,
  useCreateTeacherSalaryMutation,
  useUpdateTeacherSalaryMutation,
  useDeleteTeacherSalaryMutation,
  usePayTeacherSalarySlipMutation,
  useGetGradesQuery,
  useCreateGradeMutation,
  useUpdateGradeMutation,
  useDeleteGradeMutation,
  useGetStudentAttendanceQuery,
  useSaveStudentAttendanceMutation,
  useGetTeacherAttendanceQuery,
  useSaveTeacherAttendanceMutation,
  useGetAttendanceCategoriesQuery,
  useGetAttendanceSlotsQuery,
  useGetAttendanceRosterQuery,
  useGetAttendanceContextQuery,
  useGetAttendanceTimetableSlotsQuery,
  useGetStudentAttendanceReportQuery,
  useGetStudentAttendanceRecordsQuery,
  useGetAttendanceDaySummaryQuery,
  useGetTeacherAttendanceDaySummaryQuery,
  useGetTeacherAttendanceRecordsQuery,
  useGetTeacherAttendanceSummaryQuery,
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
  useDeleteFeeBalanceMutation,
  useGetFinanceOverviewQuery,
  useGetFinanceAccountsQuery,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useGetInventoryStatsQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useGetInventoryMovementsQuery,
  useCreateInventoryMovementMutation,
  useGetSettingsQuery,
  usePatchSettingsMutation,
  useUploadTenantLogoMutation,
  useGetBooksQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useDeleteBookMutation,

  useGetSessionsQuery,
  useGetSessionSummaryQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
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
  useDeleteSubjectBookMutation,

  useGetTimeSlotsQuery,
  useCreateTimeSlotMutation,
  useUpdateTimeSlotMutation,
  useDeleteTimeSlotMutation,
  useGetTimetableEntriesQuery,
  useCreateTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
  useDeleteTimetableEntryMutation,

  useGetGeoCountriesQuery,
  useGetGeoStatesQuery,
  useGetGeoCitiesQuery,
  useGetNextStudentIdQuery,

  useGetExamDashboardQuery,
  useGetExamResultMatrixQuery,
  useImportExamMarksMutation,
  useGetExamsQuery,
  useGetExamQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useGetExamClassesQuery,
  useAddExamClassesMutation,
  useRemoveExamClassMutation,
  useGetExamSubjectsQuery,
  useSaveExamSubjectsMutation,
  useDeleteExamSubjectMutation,
  useGetExamSnapshotQuery,
  useSaveExamRollNumbersMutation,
  useGenerateExamSnapshotMutation,
  useGetExamScheduleQuery,
  useSaveExamScheduleMutation,
  useDeleteExamScheduleMutation,
  useUpdateExamScheduleMutation,
  useGetExamAttendanceQuery,
  useSaveExamAttendanceMutation,
  useGetExamMarksQuery,
  useSaveExamMarksMutation,
  useApplyGraceMarksMutation,
  useUnlockExamMarksMutation,
  useProcessExamResultsMutation,
  useGetExamResultsQuery,
  usePublishExamResultsMutation,
  useGetExamAnalyticsQuery,
  useGetExamAuditLogQuery,
  useUnlockExamContainerMutation,
  useGetMyBooksWithProgressQuery,
  useGetBookWithReadingProgressQuery,
  useGetBookReadingRecordsQuery,
  useCreateBookReadingRecordMutation,
  useUpdateBookReadingRecordMutation,
  useDeleteBookReadingRecordMutation,
  useGetLibraryStatsQuery,
  useGetLibraryBooksQuery,
  useCreateLibraryBookMutation,
  useUpdateLibraryBookMutation,
  useDeleteLibraryBookMutation,
  useGetLibraryTransactionsQuery,
  useIssueLibraryBookMutation,
  useReturnLibraryBookMutation,
  useGetSpeechesQuery,
  useGetSpeechQuery,
  useCreateSpeechMutation,
  useUpdateSpeechMutation,
  useDeleteSpeechMutation,
} = api
