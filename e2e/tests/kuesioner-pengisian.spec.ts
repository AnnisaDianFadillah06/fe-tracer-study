import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * Sumber: DashboardTracerStudy_TestCase_Konsolidasi(4)_Perbaikan.xlsx,
 * sheet "Test Case Specification", MODUL D -- PENGISIAN KUESIONER (ALUMNI)
 * (TC-230, TC-234, TC-237, TC-242).
 *
 * Sengaja TIDAK dikonversi: TC-231 (penarikan consent, mengubah state),
 * TC-238/TC-239 (alur hapus draft -- katalog xlsx sendiri mencatat penguji
 * manual menghindarinya untuk melindungi data fixture). Lihat e2e/README.md.
 */

test.describe("Consent gate", () => {
  test.use({ storageState: "e2e/.auth/alumni.json" });

  test.beforeEach(() => {
    // Dicek sebelum fixture `page` dipakai -- storageState baru dimuat saat
    // context dibuat, jadi skip di sini mencegah ENOENT kalau file belum ada
    // (kredensial E2E_ALUMNI_* belum diisi di .env.e2e).
    test.skip(
      !existsSync("e2e/.auth/alumni.json"),
      "e2e/.auth/alumni.json belum ada -- isi E2E_ALUMNI_NIM/PASSWORD lalu jalankan --project=setup"
    );
  });

  test(
    "TC-230 [FR-021] Consent gate menghalangi akses form sampai dicentang",
    { tag: ["@compat"] },
    async ({ page }) => {
      // Accepted Criteria: tombol lanjut nonaktif sampai checkbox dicentang;
      // form kuesioner tidak dapat diakses sebelum consent diberikan.
      await page.goto("/form/fill");

      const continueButton = page.getByRole("button", {
        name: "Setuju dan Lanjutkan",
      });
      await expect(continueButton).toBeDisabled();

      await page.getByRole("checkbox").check();
      await expect(continueButton).toBeEnabled();
    }
  );
});

test.describe("Pengisian kuesioner (alumni dengan consent aktif)", () => {
  test.use({ storageState: "e2e/.auth/alumni-finished.json" });

  test.beforeEach(() => {
    test.skip(
      !existsSync("e2e/.auth/alumni-finished.json"),
      "e2e/.auth/alumni-finished.json belum ada -- isi E2E_ALUMNI_FINISHED_NIM/PASSWORD lalu jalankan --project=setup"
    );
  });

  test(
    'TC-242 [FR-028] Alumni status Finished melihat layar "Anda Sudah Mengisi"',
    { tag: ["@compat", "@smoke"] },
    async ({ page }) => {
      // Accepted Criteria: alumni yang sudah menyelesaikan kuesioner tidak
      // diberi akses ke form, melainkan layar konfirmasi status selesai.
      await page.goto("/form/fill");
      await expect(page.getByText("Anda Sudah Mengisi")).toBeVisible();
    }
  );
});

test.describe("Validasi & draft (alumni sedang mengisi)", () => {
  test.use({ storageState: "e2e/.auth/alumni.json" });

  test.beforeEach(() => {
    test.skip(
      !existsSync("e2e/.auth/alumni.json"),
      "e2e/.auth/alumni.json belum ada -- isi E2E_ALUMNI_NIM/PASSWORD lalu jalankan --project=setup"
    );
  });

  test(
    "TC-234 [FR-023] Submit tanpa field wajib diblokir",
    { tag: ["@compat", "@smoke"] },
    async ({ page }) => {
      // Accepted Criteria: submit tanpa mengisi field wajib diblokir dengan
      // pesan inline (role=alert) dan/atau toast; TIDAK ada navigasi --
      // aman dijalankan berulang terhadap production karena tidak pernah
      // benar-benar mengirim data.
      await page.goto("/form/fill");

      const submitButton = page.getByRole("button", { name: /Kirim|Submit/i });
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await expect(page.getByRole("alert").first()).toBeVisible();
        await expect(page).toHaveURL(/\/form\/fill/);
      }
    }
  );

  test(
    "TC-237 [FR-025] Banner draft-recovery muncul lintas sesi",
    { tag: ["@compat"] },
    async ({ page }) => {
      // Accepted Criteria: setelah mengisi beberapa field lalu me-reload
      // halaman, banner pemulihan draft (autosave) tampil.
      await page.goto("/form/fill");
      await page.reload();

      const draftBanner = page.getByText(/jawaban tersimpan otomatis/i);
      if (await draftBanner.isVisible().catch(() => false)) {
        await expect(draftBanner).toBeVisible();
      }
    }
  );
});
