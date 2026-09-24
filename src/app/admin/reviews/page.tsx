import ReviewsTable from "@/components/admin/ReviewsTable";

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">إدارة المراجعات</h1>
      <ReviewsTable />
    </div>
  );
}