import type { Metadata } from 'next';
import { AuthSessionSync } from '@/components/AuthSessionSync';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'Barokah POS',
  description: 'Professional Point of Sale — Barokah Core',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body suppressHydrationWarning style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <QueryProvider>
          <AuthSessionSync />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
