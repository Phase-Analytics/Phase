import { AuthRedirect } from '@/components/auth-redirect';
import { Toaster } from '@/components/ui/sonner';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirect requireAuth={false}>
      {children}
      <Toaster
        duration={5000}
        position="top-center"
        richColors
        visibleToasts={3}
      />
    </AuthRedirect>
  );
}
