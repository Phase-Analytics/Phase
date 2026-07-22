import type { ReactNode } from 'react';

export default function PublicPolicyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="min-h-screen font-sans antialiased">{children}</div>;
}
