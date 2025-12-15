import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './global.css';
import { ServiceWorkerRegister } from '@/components/sw-register';
import { baseMetadata } from '@/lib/seo';
import { ThemeProvider } from '@/lib/theme-provider';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = baseMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${jetbrainsMono.variable} flex min-h-screen flex-col font-mono antialiased`}
      >
        <ServiceWorkerRegister />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
