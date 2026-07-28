import { api } from './baseApi'

export const timetableApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetTimeSlotsQuery,
  useCreateTimeSlotMutation,
  useUpdateTimeSlotMutation,
  useDeleteTimeSlotMutation,
  useGetTimetableEntriesQuery,
  useCreateTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
  useDeleteTimetableEntryMutation
} = api
