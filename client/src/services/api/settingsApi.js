import { api } from './baseApi'

export const settingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetSettingsQuery,
  usePatchSettingsMutation,
  useUploadTenantLogoMutation,
  useGetBooksQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useDeleteBookMutation
} = api
