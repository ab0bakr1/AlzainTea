import MyOrdersList from "@/components/shop/MyOrdersList";

export const metadata = { title: "طلباتي" };

export default function AccountOrdersPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">طلباتي</h1>
      <MyOrdersList />
    </div>
  );
}