import axios from "axios";

export interface OverviewReport {
  range: { days: number; from: string };
  kpis: { paidOrders: number; totalOrders: number; newCustomers: number; pendingReviews: number };
  revenueByCurrency: { currency: string; total: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { productId: string; slug: string; nameAr: string; nameEn: string; unitsSold: number }[];
  salesByCountry: { country: string; currency: string; total: number; orders: number }[];
  dailyOrders: { date: string; orders: number }[];
  lowStock: LowStockItem[];
}

export interface LowStockItem {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  stock: number;
  reservedStock: number;
  available: number;
}

export async function fetchOverviewReport(days: number) {
  const res = await axios.get("/api/admin/reports/overview", { params: { days } });
  return res.data.data as OverviewReport;
}