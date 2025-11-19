'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { authClient } from '@/lib/auth';

export default function AuthPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Login attempt:', { email: loginEmail });

    const { data, error } = await authClient.signIn.email({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      console.error('❌ Login error:', error);
      return;
    }

    console.log('✅ Login success:', data);

    // Debug: Check cookies
    console.log('🍪 All cookies:', document.cookie);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Register attempt:', {
      name: registerName,
      email: registerEmail,
    });

    const { data, error } = await authClient.signUp.email({
      name: registerName,
      email: registerEmail,
      password: registerPassword,
    });

    if (error) {
      console.error('❌ Register error:', error);
      return;
    }

    console.log('✅ Register success:', data);

    // Debug: Check cookies
    console.log('🍪 All cookies:', document.cookie);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">Auth Test</h1>
          <p className="text-muted-foreground text-sm">
            Test authentication flows
          </p>
        </div>

        <Tabs className="w-full" defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContents>
            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="login-email">
                    Email
                  </label>
                  <Input
                    id="login-email"
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="test@example.com"
                    required
                    type="email"
                    value={loginEmail}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="login-password"
                  >
                    Password
                  </label>
                  <Input
                    id="login-password"
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    type="password"
                    value={loginPassword}
                  />
                </div>

                <Button className="w-full" type="submit">
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="register-name"
                  >
                    Name
                  </label>
                  <Input
                    id="register-name"
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    required
                    type="text"
                    value={registerName}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="register-email"
                  >
                    Email
                  </label>
                  <Input
                    id="register-email"
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="test@example.com"
                    required
                    type="email"
                    value={registerEmail}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="register-password"
                  >
                    Password
                  </label>
                  <Input
                    id="register-password"
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    type="password"
                    value={registerPassword}
                  />
                </div>

                <Button className="w-full" type="submit">
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </TabsContents>
        </Tabs>

        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-muted-foreground text-xs">
            💡 Check console for auth responses
          </p>
        </div>
      </div>
    </div>
  );
}
