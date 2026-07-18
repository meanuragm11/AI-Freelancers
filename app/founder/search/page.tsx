import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function FounderSearchRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim();
  redirect(q ? `/founder?q=${encodeURIComponent(q)}` : '/founder');
}
