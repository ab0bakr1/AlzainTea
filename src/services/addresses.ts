import axios from "axios";

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postalCode: string | null;
  isDefault: boolean;
}

export interface AddressPayload {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postalCode?: string;
  isDefault: boolean;
}

interface ApiOk<T> {
  success: true;
  data: T;
}

const unwrap = <T>(request: Promise<{ data: ApiOk<T> }>) => request.then((r) => r.data.data);

export const addressService = {
  list: () => unwrap(axios.get<ApiOk<Address[]>>("/api/addresses")),
  create: (body: AddressPayload) => unwrap(axios.post<ApiOk<Address>>("/api/addresses", body)),
  update: (id: string, body: Partial<AddressPayload>) =>
    unwrap(axios.patch<ApiOk<Address>>(`/api/addresses/${id}`, body)),
  remove: (id: string) => unwrap(axios.delete<ApiOk<{ deleted: boolean }>>(`/api/addresses/${id}`)),
};

/** يستخرج رسالة الخطأ الموحدة { success:false, error:{ message } } من استجابة الـ API. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (message) return message;
  }
  return fallback;
}