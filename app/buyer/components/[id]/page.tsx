import { redirect } from "next/navigation";

export default async function LegacyComponentDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/service/${id}`);
}
