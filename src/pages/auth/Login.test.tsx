import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockLogin = vi.fn();
const mockAlumniLogin = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/hooks/common/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({ login: mockLogin, isLoading: false }),
}));

vi.mock("@/hooks/auth/useStudentAuth", () => ({
  useStudentAuth: () => ({ login: mockAlumniLogin }),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login handleSubmit", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockToast.mockClear();
    mockLogin.mockReset();
  });

  it("mengarahkan ke /dashboard/overview setelah login staf berhasil", async () => {
    mockLogin.mockResolvedValueOnce({ user: { role: "head_tracer" } });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "head@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Masuk/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard/overview"));
  });
});
