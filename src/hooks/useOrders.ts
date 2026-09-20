"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/orders.service";
import type { OrderStatusValue } from "@/modules/orders/order-status";

export const orderKeys = {
  all: ["orders"] as const,
  admin: (p: api.AdminOrdersParams) => ["orders", "admin", p] as const,
  adminOne: (id: string) => ["orders", "admin", "one", id] as const,
  mine: (page: number) => ["orders", "mine", page] as const,
  mineOne: (id: string) => ["orders", "mine", "one", id] as const,
};

export function useAdminOrders(params: api.AdminOrdersParams) {
  return useQuery({
    queryKey: orderKeys.admin(params),
    queryFn: () => api.fetchAdminOrders(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({ queryKey: orderKeys.adminOne(id), queryFn: () => api.fetchAdminOrder(id) });
}

export function useUpdateOrderStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: OrderStatusValue; note?: string; restock?: boolean }) =>
      api.updateAdminOrderStatus(id, body),
    onSuccess: (order) => {
      qc.setQueryData(orderKeys.adminOne(id), order);
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useMyOrders(page: number) {
  return useQuery({
    queryKey: orderKeys.mine(page),
    queryFn: () => api.fetchMyOrders(page),
    placeholderData: keepPreviousData,
  });
}

export function useMyOrder(id: string) {
  return useQuery({ queryKey: orderKeys.mineOne(id), queryFn: () => api.fetchMyOrder(id) });
}

export function useCancelMyOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => api.cancelMyOrder(id, reason),
    onSuccess: (order) => {
      qc.setQueryData(orderKeys.mineOne(id), order);
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}