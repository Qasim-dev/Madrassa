import { api } from './baseApi'

export const bookReadingApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetMyBooksWithProgressQuery,
  useGetBookWithReadingProgressQuery,
  useGetBookReadingRecordsQuery,
  useCreateBookReadingRecordMutation,
  useUpdateBookReadingRecordMutation,
  useDeleteBookReadingRecordMutation
} = api
