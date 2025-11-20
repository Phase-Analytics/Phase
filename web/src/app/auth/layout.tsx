import { AuthRedirect } from '@/components/auth-redirect';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme-provider';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirect requireAuth={false}>
      <ThemeProvider>{children}</ThemeProvider>
      <Toaster
        duration={5000}
        position="top-center"
        richColors
        visibleToasts={3}
      />
    </AuthRedirect>
  );
}
