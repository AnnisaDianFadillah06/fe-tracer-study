import { test, expect } from "@playwright/test";

/**
 * Sumber: DashboardTracerStudy_TestCase_Konsolidasi(4)_Perbaikan.xlsx,
 * sheet "Test Case Specification", MODUL LOGIN (TC-001..TC-004).
 * Tidak butuh storageState -- semua kasus di file ini menguji halaman login
 * itu sendiri, belum ada sesi.
 */

test(
  "TC-001 [FR-001,FR-002] Landing page publik menampilkan ringkasan sistem",
  { tag: ["@compat", "@smoke"] },
  async ({ page }) => {
    // Accepted Criteria: halaman publik dapat diakses tanpa login, menampilkan
    // ringkasan sistem, serta tautan Masuk dan Dashboard publik.
    await page.goto("/");

    // Di viewport sempit, navbar collapse ke hamburger menu tanpa label --
    // buka dulu supaya tombol Masuk/Dashboard kelihatan.
    const masukButton = page.getByRole("button", { name: "Masuk" });
    if (!(await masukButton.isVisible())) {
      await page.locator("nav").getByRole("button").first().click();
    }

    await expect(masukButton).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Dashboard/i })
    ).toBeVisible();
  }
);

test(
  "TC-002 [FR-001,FR-002] Halaman login menampilkan form autentikasi lengkap",
  { tag: ["@compat"] },
  async ({ page }) => {
    // Accepted Criteria: form login kosong menampilkan field identitas,
    // password (dengan toggle visibilitas), tautan lupa password, dan
    // tombol submit "Masuk".
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByText("Lupa password?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();

    // Toggle visibilitas password (ikon mata) -- TC-199 turunan yang sama.
    await page.locator("#password").fill("contoh-password");
    await expect(page.locator("#password")).toHaveAttribute("type", "password");
    await page.locator("#password").locator("..").getByRole("button").click();
    await expect(page.locator("#password")).toHaveAttribute("type", "text");
  }
);

test(
  "TC-003 [FR-001,FR-002] Login sukses dengan kredensial staff valid",
  { tag: ["@compat", "@smoke"] },
  async ({ page }) => {
    const email = process.env.E2E_HEAD_TRACER_EMAIL;
    const password = process.env.E2E_HEAD_TRACER_PASSWORD;
    test.skip(!email || !password, "Kredensial E2E_HEAD_TRACER_* belum diisi");

    // Accepted Criteria: login staf valid mengarahkan ke dashboard sesuai peran.
    await page.goto("/login");
    await page.locator("#identifier").fill(email!);
    await page.locator("#password").fill(password!);
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page).toHaveURL(/\/dashboard\/overview/);
  }
);

test(
  "TC-004 [FR-001,FR-002] Login gagal dengan kredensial tidak valid",
  { tag: ["@compat", "@smoke"] },
  async ({ page }) => {
    // Accepted Criteria: kredensial salah menampilkan pesan error dan tetap
    // di halaman login, tanpa membocorkan data sensitif.
    await page.goto("/login");
    await page.locator("#identifier").fill("tidak-terdaftar@example.com");
    await page.locator("#password").fill("password-salah-sekali");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByText("Login Gagal").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  }
);
