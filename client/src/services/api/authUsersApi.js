import { api } from './baseApi'

export const authUsersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
    }),
    register: builder.mutation({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
    }),
    refreshToken: builder.mutation({
      query: (body) => ({ url: 'auth/refresh', method: 'POST', body }),
    }),
    logoutSession: builder.mutation({
      query: () => ({ url: 'auth/logout', method: 'POST' }),
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({ url: 'auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: 'auth/reset-password', method: 'POST', body }),
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
    getUsers: builder.query({
      query: () => 'users',
      providesTags: ['User'],
    }),
    createUser: builder.mutation({
      query: (body) => ({ url: 'users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    patchUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
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
    })
  }),
  overrideExisting: false,
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutSessionMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
  usePatchMeMutation,
  usePatchTenantMutation,
  useChangePasswordMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  usePatchUserMutation,
  useDeleteUserMutation,
  useGetDashboardStatsQuery,
  useLazyGetSearchSuggestionsQuery
} = api
