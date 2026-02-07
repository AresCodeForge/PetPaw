import AdminOrderDetailClient from "./AdminOrderDetailClient";

type Props = { params: Promise<{ orderId: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  return <AdminOrderDetailClient orderId={orderId} />;
}
