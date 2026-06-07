import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InvestX | The Future of Trading',
  description: 'A premium simulation platform for trading, market analytics, and portfolio management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
