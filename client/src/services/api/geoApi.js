import { api } from './baseApi'

export const geoApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetGeoCountriesQuery,
  useGetGeoStatesQuery,
  useGetGeoCitiesQuery
} = api
