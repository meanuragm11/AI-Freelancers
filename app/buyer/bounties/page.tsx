import { redirect } from 'next/navigation';

export default function BountiesRedirect() {
  redirect('/projects/new');
}
