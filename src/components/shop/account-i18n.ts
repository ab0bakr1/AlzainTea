"use client";

import { useLocale } from "next-intl";

type Lang = "ar" | "en";

const ar = {
  title: "حسابي",
  subtitle: "إدارة بياناتك وعناوين الشحن وطلباتك",
  email: "البريد الإلكتروني",
  role: "نوع الحساب",
  roleCustomer: "عميل",
  roleAdmin: "مدير",
  orders: "طلباتي",
  ordersDesc: "تتبع طلباتك وحالتها",
  wishlist: "المفضلة",
  wishlistDesc: "المنتجات التي حفظتها",
  adminPanel: "لوحة الإدارة",
  adminPanelDesc: "إدارة المتجر",
  signOut: "تسجيل الخروج",
  signIn: "سجّل الدخول لعرض حسابك",
  addresses: "عناوين الشحن",
  addressesDesc: "العناوين المحفوظة لإتمام الشراء بسرعة",
  add: "إضافة عنوان",
  addTitle: "عنوان جديد",
  editTitle: "تعديل العنوان",
  edit: "تعديل",
  delete: "حذف",
  setDefault: "تعيين كافتراضي",
  default: "افتراضي",
  emptyTitle: "لا توجد عناوين محفوظة",
  emptyDesc: "أضف عنوانك الأول ليظهر تلقائياً عند الدفع.",
  loadError: "تعذر تحميل العناوين.",
  retry: "إعادة المحاولة",
  fullName: "الاسم الكامل",
  phone: "رقم الهاتف",
  country: "الدولة",
  city: "المدينة",
  street: "العنوان",
  streetHint: "الحي، الشارع، رقم المبنى",
  postalCode: "الرمز البريدي",
  optional: "اختياري",
  makeDefault: "استخدامه كعنوان افتراضي",
  save: "حفظ العنوان",
  saveChanges: "حفظ التعديلات",
  saving: "جارٍ الحفظ...",
  cancel: "إلغاء",
  close: "إغلاق",
  deleteTitle: "حذف العنوان",
  deleteMsg: "سيتم حذف هذا العنوان نهائياً من حسابك.",
  confirmDelete: "نعم، احذف",
  deleting: "جارٍ الحذف...",
  saved: "تم حفظ العنوان",
  removed: "تم حذف العنوان",
  defaultSet: "تم تعيين العنوان الافتراضي",
  genericError: "حدث خطأ غير متوقع، حاول مرة أخرى.",
  vFullName: "أدخل الاسم الكامل (حرفان على الأقل)",
  vPhone: "رقم الهاتف غير صالح",
  vCountry: "اختر الدولة",
  vCity: "المدينة مطلوبة",
  vStreet: "العنوان مطلوب",
};

export type AccountText = Record<keyof typeof ar, string>;

const en: AccountText = {
    title: "My account",
    subtitle: "Manage your details, shipping addresses and orders",
    email: "Email",
    role: "Account type",
    roleCustomer: "Customer",
    roleAdmin: "Admin",
    orders: "My orders",
    ordersDesc: "Track your orders and their status",
    wishlist: "Wishlist",
    wishlistDesc: "Products you saved",
    adminPanel: "Admin panel",
    adminPanelDesc: "Manage the store",
    signOut: "Sign out",
    signIn: "Sign in to view your account",
    addresses: "Shipping addresses",
    addressesDesc: "Saved addresses for faster checkout",
    add: "Add address",
    addTitle: "New address",
    editTitle: "Edit address",
    edit: "Edit",
    delete: "Delete",
    setDefault: "Set as default",
    default: "Default",
    emptyTitle: "No saved addresses",
    emptyDesc: "Add your first address and it will be ready at checkout.",
    loadError: "Couldn't load your addresses.",
    retry: "Try again",
    fullName: "Full name",
    phone: "Phone number",
    country: "Country",
    city: "City",
    street: "Address",
    streetHint: "District, street, building number",
    postalCode: "Postal code",
    optional: "Optional",
    makeDefault: "Use as my default address",
    save: "Save address",
    saveChanges: "Save changes",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    deleteTitle: "Delete address",
    deleteMsg: "This address will be permanently removed from your account.",
    confirmDelete: "Yes, delete",
    deleting: "Deleting...",
    saved: "Address saved",
    removed: "Address deleted",
    defaultSet: "Default address updated",
    genericError: "Something went wrong. Please try again.",
    vFullName: "Enter your full name (at least 2 characters)",
    vPhone: "Phone number is not valid",
    vCountry: "Select a country",
    vCity: "City is required",
    vStreet: "Address is required",
};

const dict: Record<Lang, AccountText> = { ar, en };

export function useAccountText(): { t: AccountText; lang: Lang } {
  const lang: Lang = useLocale() === "ar" ? "ar" : "en";
  return { t: dict[lang], lang };
}

/** استبدلها باستيراد الدول المدعومة من shipping-rates.ts إن رغبت بحصرها على دول الشحن. */
export const COUNTRY_CODES = ["SA", "AE", "OM", "KW", "BH", "QA", "US", "GB", "DE"];

export function countryName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}