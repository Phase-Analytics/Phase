import { ForceDarkTheme } from '@/components/force-dark-theme';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForceDarkTheme>{children}</ForceDarkTheme>;
}
