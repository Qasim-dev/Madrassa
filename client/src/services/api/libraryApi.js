import { api } from './baseApi'

export const libraryApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetLibraryStatsQuery,
  useGetLibraryBooksQuery,
  useCreateLibraryBookMutation,
  useUpdateLibraryBookMutation,
  useDeleteLibraryBookMutation,
  useGetLibraryTransactionsQuery,
  useIssueLibraryBookMutation,
  useReturnLibraryBookMutation
} = api
