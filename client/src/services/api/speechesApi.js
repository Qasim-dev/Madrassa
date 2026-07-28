import { api } from './baseApi'

export const speechesApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetSpeechesQuery,
  useGetSpeechQuery,
  useCreateSpeechMutation,
  useUpdateSpeechMutation,
  useDeleteSpeechMutation
} = api
