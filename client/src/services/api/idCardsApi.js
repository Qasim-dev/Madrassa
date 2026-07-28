import { api } from './baseApi'

export const idCardsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getIdCardTemplates: builder.query({
      query: () => 'id-cards/templates',
      providesTags: ['IdCard'],
    }),
    getIdCardStudents: builder.query({
      query: (params) => ({ url: 'id-cards/cards', params }),
      providesTags: ['IdCard'],
    }),
    generateIdCards: builder.mutation({
      query: (body) => ({ url: 'id-cards/cards/generate', method: 'POST', body }),
      invalidatesTags: ['IdCard'],
    }),
    getIdCardPrintPayload: builder.query({
      query: (params) => ({ url: 'id-cards/cards/print-payload', params }),
      providesTags: ['IdCard'],
    }),
    getIdCardPrintHistory: builder.query({
      query: (params) => ({ url: 'id-cards/print-history', params }),
      providesTags: ['IdCard'],
    }),
    logIdCardPrint: builder.mutation({
      query: (body) => ({ url: 'id-cards/print-history', method: 'POST', body }),
      invalidatesTags: ['IdCard'],
    }),
    verifyIdCard: builder.query({
      query: (token) => `public/id-cards/verify/${token}`,
    })
  }),
  overrideExisting: false,
})

export const {
  useGetIdCardTemplatesQuery,
  useGetIdCardStudentsQuery,
  useGenerateIdCardsMutation,
  useGetIdCardPrintPayloadQuery,
  useGetIdCardPrintHistoryQuery,
  useLogIdCardPrintMutation,
  useVerifyIdCardQuery
} = api
