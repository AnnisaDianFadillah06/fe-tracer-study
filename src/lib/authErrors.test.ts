import { describe, expect, it } from "vitest";
import { isAccountDisabled, isRateLimited, toLoginError } from "./authErrors";

function axiosErrorLike(status: number, data: any): any {
  return { response: { status, data } };
}

describe("toLoginError", () => {
  it("429 membaca retry_after dari BODY, bukan dari header Retry-After", () => {
    const err = axiosErrorLike(429, { retry_after: 45 });

    const result = toLoginError(err, "fallback");

    expect(result.status).toBe(429);
    expect(result.retryAfter).toBe(45);
    expect(result.message).toContain("45 detik");
  });

  it("429 tanpa retry_after di body default ke 60 detik", () => {
    const err = axiosErrorLike(429, {});

    const result = toLoginError(err, "fallback");

    expect(result.retryAfter).toBe(60);
  });

  it("429 memakai message dari server kalau ada, bukan pesan default", () => {
    const err = axiosErrorLike(429, { retry_after: 10, message: "Custom rate limit message" });

    const result = toLoginError(err, "fallback");

    expect(result.message).toBe("Custom rate limit message");
  });

  it("error non-429 memprioritaskan errors.email[0] di atas message/fallback", () => {
    const err = axiosErrorLike(422, {
      message: "Validasi gagal",
      errors: { email: ["Email tidak valid"] },
    });

    const result = toLoginError(err, "fallback");

    expect(result.message).toBe("Email tidak valid");
    expect(result.status).toBe(422);
  });

  it("error non-429 tanpa errors.email jatuh ke message body", () => {
    const err = axiosErrorLike(401, { message: "Kredensial salah" });

    const result = toLoginError(err, "fallback");

    expect(result.message).toBe("Kredensial salah");
  });

  it("error tanpa response sama sekali jatuh ke fallback (network error)", () => {
    const err = new Error("Network Error");

    const result = toLoginError(err, "Tidak bisa terhubung ke server");

    expect(result.message).toBe("Tidak bisa terhubung ke server");
    expect(result.status).toBeUndefined();
  });
});

describe("isRateLimited", () => {
  it("true untuk LoginError dengan status 429", () => {
    expect(isRateLimited({ status: 429 })).toBe(true);
  });

  it("true untuk raw axios error dengan response.status 429", () => {
    expect(isRateLimited(axiosErrorLike(429, {}))).toBe(true);
  });

  it("false untuk status lain", () => {
    expect(isRateLimited({ status: 401 })).toBe(false);
  });
});

describe("isAccountDisabled", () => {
  it("true untuk status 403 (akun nonaktif), dibedakan dari kredensial salah", () => {
    expect(isAccountDisabled({ status: 403 })).toBe(true);
    expect(isAccountDisabled(axiosErrorLike(403, {}))).toBe(true);
  });

  it("false untuk 401 (kredensial salah biasa)", () => {
    expect(isAccountDisabled({ status: 401 })).toBe(false);
  });
});
