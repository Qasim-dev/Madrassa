import { api } from './baseApi'

export const examsApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
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
  useUnlockExamContainerMutation
} = api
