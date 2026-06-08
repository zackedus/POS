import { redirect } from 'next/navigation';

export default function DepositsRedirectPage() {
  redirect('/dashboard/finance?tab=deposit');
}
