"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setError(null);

    if (!email || !password) {
      setError("Введите email и пароль.");
      return;
    }

    startTransition(async () => {
      try {
        await login({ email, password });
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось войти");
      }
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Вход в платформу</CardTitle>
        <CardDescription>
          Используйте корпоративный аккаунт, чтобы перейти к финансовому дашборду.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="finance@company.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Входим..." : "Войти"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Демо-версия принимает любые корректные учетные данные и хранит сессию на стороне BFF.
        </p>
      </CardContent>
    </Card>
  );
}
