import { test as setup } from "@playwright/test";

const authDir = "e2e/.auth";

/**
 * setup.skip (bukan throw) untuk akun yang belum tersedia -- proyek browser
 * lain (chromium/firefox/webkit/msedge/Mobile Chrome) di-dependencies ke
 * seluruh proyek "setup", jadi satu sub-test yang throw akan menggagalkan
 * seluruh suite di semua browser. TC yang butuh storageState role tertentu
 * tetap skip sendiri lewat pengecekan file di test-nya masing-masing.
 */

setup("authenticate as head_tracer", async ({ page }) => {
  const email = process.env.E2E_HEAD_TRACER_EMAIL;
  const password = process.env.E2E_HEAD_TRACER_PASSWORD;
  setup.skip(!email || !password, "E2E_HEAD_TRACER_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard/overview");

  await page.context().storageState({ path: `${authDir}/head_tracer.json` });
});

setup("authenticate as kaprodi", async ({ page }) => {
  const email = process.env.E2E_KAPRODI_EMAIL;
  const password = process.env.E2E_KAPRODI_PASSWORD;
  setup.skip(!email || !password, "E2E_KAPRODI_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard/overview");

  await page.context().storageState({ path: `${authDir}/kaprodi.json` });
});

setup("authenticate as tracer_team", async ({ page }) => {
  const email = process.env.E2E_TRACER_TEAM_EMAIL;
  const password = process.env.E2E_TRACER_TEAM_PASSWORD;
  setup.skip(!email || !password, "E2E_TRACER_TEAM_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard/overview");

  await page.context().storageState({ path: `${authDir}/tracer_team.json` });
});

setup("authenticate as wadir", async ({ page }) => {
  const email = process.env.E2E_WADIR_EMAIL;
  const password = process.env.E2E_WADIR_PASSWORD;
  setup.skip(!email || !password, "E2E_WADIR_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard/overview");

  await page.context().storageState({ path: `${authDir}/wadir.json` });
});

setup("authenticate as kajur", async ({ page }) => {
  const email = process.env.E2E_KAJUR_EMAIL;
  const password = process.env.E2E_KAJUR_PASSWORD;
  setup.skip(!email || !password, "E2E_KAJUR_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard/overview");

  await page.context().storageState({ path: `${authDir}/kajur.json` });
});

setup("authenticate as dekan", async ({ page }) => {
  const email = process.env.E2E_DEKAN_EMAIL;
  const password = process.env.E2E_DEKAN_PASSWORD;
  setup.skip(!email || !password, "E2E_DEKAN_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard/overview");

  await page.context().storageState({ path: `${authDir}/dekan.json` });
});

setup("authenticate as alumni (consent belum diberikan)", async ({ page }) => {
  const nim = process.env.E2E_ALUMNI_NIM;
  const password = process.env.E2E_ALUMNI_PASSWORD;
  setup.skip(!nim || !password, "E2E_ALUMNI_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(nim!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/form/fill");

  await page.context().storageState({ path: `${authDir}/alumni.json` });
});

setup("authenticate as alumni (kuesioner sudah Finished)", async ({ page }) => {
  const nim = process.env.E2E_ALUMNI_FINISHED_NIM;
  const password = process.env.E2E_ALUMNI_FINISHED_PASSWORD;
  setup.skip(!nim || !password, "E2E_ALUMNI_FINISHED_* belum diisi di .env.e2e");

  await page.goto("/login");
  await page.locator("#identifier").fill(nim!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/form/fill");

  await page.context().storageState({ path: `${authDir}/alumni-finished.json` });
});
