import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

const login = vi.fn();

vi.mock("@/lib/api", () => ({
  login: (...args: unknown[]) => login(...args),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    push.mockReset();
    login.mockReset();
  });

  it("submits credentials and redirects", async () => {
    login.mockResolvedValueOnce({ token: "demo" });
    render(<LoginForm />);
    const user = userEvent.setup();

    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/пароль/i);

    await user.type(email, "user@example.com");
    await user.type(password, "secret");
    await user.click(screen.getByRole("button", { name: /войти/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret",
      });
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error message when BFF returns failure", async () => {
    login.mockRejectedValueOnce(new Error("Неверный код"));
    render(<LoginForm />);

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/пароль/i), "secret");
    await user.click(screen.getByRole("button", { name: /войти/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Неверный код");
    });
  });
});
