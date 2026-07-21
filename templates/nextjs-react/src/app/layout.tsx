import type { Metadata } from 'next';
import { Providers } from './providers';
import '../style.css';

export const metadata: Metadata = {
  title: 'BOT Chain dApp',
  description: 'Scaffolded with bot-cli',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
