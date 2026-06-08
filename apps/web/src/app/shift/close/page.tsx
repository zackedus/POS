import { redirect } from 'next/navigation';

export default function CloseShiftRedirect() {
  redirect('/shift?action=close');
}
