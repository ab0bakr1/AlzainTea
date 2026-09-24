import * as repo from "./report.repository";

const DAY_MS = 86_400_000;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** يملأ الأيام الناقصة بصفر ليرسم المخطط بشكل متصل */
function fillDailySeries(from: Date, days: number, rows: { day: Date; orders: number }[]) {
  const byDay = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r.orders]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(from.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { date, orders: byDay.get(date) ?? 0 };
  });
}

export async function getOverview(days: number) {
  const from = startOfUtcDay(new Date(Date.now() - (days - 1) * DAY_MS));

  const [revenue, byStatus, byCountry, top, newCustomers, pendingReviews, daily, lowStock] =
    await Promise.all([
      repo.revenueByCurrency(from),
      repo.ordersByStatus(from),
      repo.salesByCountry(from),
      repo.topProducts(from, 5),
      repo.countNewCustomers(from),
      repo.countPendingReviews(),
      repo.dailyPaidOrders(from),
      repo.lowStock(DEFAULT_LOW_STOCK_THRESHOLD),
    ]);

  return {
    range: { days, from: from.toISOString() },
    kpis: {
      paidOrders: revenue.reduce((s, r) => s + r.orders, 0),
      totalOrders: byStatus.reduce((s, r) => s + r.count, 0),
      newCustomers,
      pendingReviews,
    },
    revenueByCurrency: revenue.sort((a, b) => b.orders - a.orders),
    ordersByStatus: byStatus,
    topProducts: top,
    salesByCountry: byCountry,
    dailyOrders: fillDailySeries(from, days, daily),
    lowStock,
  };
}

export async function getLowStock(threshold: number) {
  return { threshold, items: await repo.lowStock(threshold) };
}