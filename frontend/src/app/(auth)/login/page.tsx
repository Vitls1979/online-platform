import type { Metadata } from "next";

import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Вход в систему",
};

export default function LoginPage() {
  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <div className="mx-auto w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Добро пожаловать!</h1>
          <p className="text-muted-foreground">
            Авторизуйтесь, чтобы управлять финансовыми потоками и отслеживать показатели бизнеса.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
