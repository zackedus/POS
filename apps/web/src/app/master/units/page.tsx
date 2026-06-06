import { redirect } from 'next/navigation';

export default function MasterUnitsRedirectPage() {
  redirect('/dashboard/units');
}
