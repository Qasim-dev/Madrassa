import { api } from './baseApi'

export const inventoryApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    })
  }),
  overrideExisting: false,
})

export const {
  useGetInventoryStatsQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useGetInventoryMovementsQuery,
  useCreateInventoryMovementMutation
} = api
