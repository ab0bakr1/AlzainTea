"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addressService, type AddressPayload } from "@/services/addresses";

export const ADDRESSES_KEY = ["addresses"] as const;

export function useAddresses() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ADDRESSES_KEY });

  const query = useQuery({ queryKey: ADDRESSES_KEY, queryFn: addressService.list });

  const create = useMutation({
    mutationFn: (data: AddressPayload) => addressService.create(data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AddressPayload> }) =>
      addressService.update(id, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => addressService.remove(id),
    onSuccess: invalidate,
  });

  return { query, create, update, remove };
}