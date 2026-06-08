import { redirect } from 'next/navigation';

export default function ReceivableAgingRedirectPage() {
  redirect('/dashboard/finance?tab=aging');
}
