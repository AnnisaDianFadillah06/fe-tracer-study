// Rekam video demo fungsional (≤ 4 menit). Fokus: OLAP Multidimensi Insight
// dengan studi kasus rata-rata gaji alumni menurut jenis, level, dan lokasi
// perusahaan (slice, dice, drill-down/roll-up lokasi dan program studi),
// diapit sekilas Overview & Employment Outcome, lalu Educational Assessment
// (gap kompetensi dan persepsi metode pembelajaran) untuk Koordinator Prodi.
// Video hanya menampilkan aplikasi web (tanpa kartu/teks tambahan).
//
//   node scripts/demo-video/record-demo.mjs            rekam penuh → MP4
//   HEADED=1 node scripts/demo-video/record-demo.mjs   sama, browser terlihat
//   FAST=1 HEADED=1 node scripts/demo-video/...        uji selector cepat, tanpa MP4
//
// Prasyarat: backend :8000, Cube.js, dan `npm run dev` (:8080) menyala;
// ffmpeg terpasang. Tidak ada data yang ditulis ke database.

import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAST,
  clickSmooth,
  cursorPos,
  glideTo,
  glideToPoint,
  hold,
  installOverlay,
  markClock,
  smoothScroll,
  typeSlow,
  unveil,
  veil,
  zoomEvents,
  zoomIn,
  zoomOn,
  zoomOut,
} from "./motion.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:8080";
const API = process.env.DEMO_API_URL ?? "http://localhost:8000/api";
const OUT_DIR = path.resolve(process.env.DEMO_OUT_DIR ?? path.join(HERE, "../../../demo-video"));
const PASSWORD = process.env.DEMO_PASSWORD ?? "password123";
const MAX_SECONDS = 240;

const ACCOUNTS = {
  kotc: process.env.DEMO_KOTC_EMAIL ?? "tracer2@test.com",
  // Gap kompetensi terkecil (snapshot terbaru) ada di D-4 Manajemen Pemasaran.
  kaprodi: process.env.DEMO_KAPRODI_EMAIL ?? "kaprodi.d4.manajemen.pemasaran@polban.ac.id",
};

// ─── Utilitas ────────────────────────────────────────────────────────────────

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.data?.token) {
    throw new Error(`Login ${email} gagal (${res.status}): ${body?.message ?? "tanpa pesan"}`);
  }
  return { token: body.data.token, user: body.data.user };
}

/** Tunggu sampai kartu KPI selesai memuat dan Insight selesai menghitung. */
async function settle(page, timeout = 30_000) {
  await page.waitForTimeout(350);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const busy = await page.evaluate(() => {
      const loadingCard = document.querySelector('.glass-card[aria-busy="true"]');
      const computing = [...document.querySelectorAll('[role="status"]')].some((el) =>
        el.textContent?.includes("Menghitung"),
      );
      return !!loadingCard || computing;
    });
    if (!busy) return;
    await page.waitForTimeout(250);
  }
  console.warn("  ! settle: masih memuat setelah batas waktu, lanjut");
}

/**
 * Pindah halaman (dan bila perlu ganti akun) di balik tirai polos, sehingga
 * layar login dan layar memuat tidak ikut terekam.
 */
async function open(page, url, session, beforeUnveil) {
  await veil(page);
  if (session) {
    await page.evaluate(({ token, user }) => {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
      localStorage.setItem("insight.advanced", "0");
      sessionStorage.removeItem("insight.chart3d");
    }, session);
  }
  await page.goto(`${BASE}${url}`);
  await settle(page);
  await hold(page, 500);
  beforeUnveil?.();
  await unveil(page);
}

/**
 * Pindah halaman seperti pengguna: kursor ke menu sidebar, kamera mendekat
 * sebentar ke menunya, klik, lalu kamera kembali selagi halaman memuat.
 */
async function navigate(page, href) {
  const link = page.locator(`aside a[href="${href}"]`).first();
  await link.waitFor({ state: "visible", timeout: 15_000 });
  await glideTo(page, link);
  await zoomIn(page, link, { max: 2.0, pad: 60 });
  await clickSmooth(page, link, { pause: 300 });
  await zoomOut(page);
  await page.waitForURL(`**${href}`, { timeout: 15_000 });
  await settle(page);
  await hold(page, 600);
}

const kpiCard = (page, title) =>
  page
    .locator("h3", { hasText: title })
    .first()
    .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " glass-card ")][1]');

async function openTab(page, name) {
  await clickSmooth(page, page.getByRole("tab", { name }));
  await settle(page);
  await hold(page, 1000); // animasi masuk grafik
}

/** Kotak terkecil yang memuat semua kotak (null diabaikan). */
function unionBox(...boxes) {
  const b = boxes.filter(Boolean);
  const x = Math.min(...b.map((r) => r.x));
  const y = Math.min(...b.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...b.map((r) => r.x + r.width)) - x,
    height: Math.max(...b.map((r) => r.y + r.height)) - y,
  };
}

/**
 * Satu tooltip, dilihat dekat: kursor ke titik (x, y), lalu kamera mendekat
 * ke kotak tooltip yang benar-benar tampil + titik yang disorot. Posisi
 * tooltip diukur dari layar karena Recharts memindahkannya ke kiri/atas
 * kursor bila dekat tepi kartu.
 */
async function tooltipAt(page, scope, x, y, ms = 2600) {
  await glideToPoint(page, x, y, 900);
  await hold(page, 600);
  const tip = await scope.locator(".recharts-tooltip-wrapper").first().boundingBox().catch(() => null);
  const point = { x: x - 18, y: y - 18, width: 36, height: 36 };
  const target = tip && tip.width > 0 ? unionBox(tip, point) : { x: x - 260, y: y - 150, width: 760, height: 380 };
  await zoomIn(page, target, { max: 2.6, pad: 28 });
  await hold(page, ms);
  await zoomOut(page);
}

/** Tooltip satu batang Recharts di kartu KPI (index -1 = batang terakhir). */
async function barTooltip(page, title, index, ms) {
  const card = kpiCard(page, title);
  await smoothScroll(page, card);
  const bars = card.locator(".recharts-bar-rectangle");
  await bars.first().waitFor({ state: "visible", timeout: 30_000 });
  const n = await bars.count();
  const box = await bars.nth(index < 0 ? n + index : index).boundingBox();
  await tooltipAt(page, card, box.x + box.width / 2, box.y + Math.min(box.height / 2, 14), ms);
}

/** Pilih satu nilai di filter global dashboard (Radix Select berlabel `label`). */
async function pickGlobalFilter(page, label, option) {
  const field = page
    .getByRole("region", { name: "Filter global dashboard" })
    .locator("div.flex-col")
    .filter({ has: page.locator(":scope > label", { hasText: new RegExp(`^\\s*${label}\\s*$`, "i") }) });
  const trigger = field.locator("button").first();
  // Ukur sebelum dibuka: Select Radix yang terbuka menyembunyikan elemen lain
  // dari pohon aksesibilitas, jadi tombolnya tidak bisa dicari lagi.
  const triggerBox = await trigger.boundingBox();
  await clickSmooth(page, trigger);
  const list = page.getByRole("listbox");
  await list.waitFor({ state: "visible", timeout: 15_000 });
  await zoomIn(page, unionBox(triggerBox, await list.boundingBox()), { max: 2.0, pad: 16 });
  await clickSmooth(page, page.getByRole("option", { name: option, exact: true }));
  await zoomOut(page);
}

/**
 * Threshold akreditasi pada satu kartu KPI: sorot subjudul standar (LAM,
 * indikator, level, ambang), lalu naikkan level Baik → Unggul agar garis
 * ambang bergeser dan warna batang dinilai ulang.
 */
async function showThreshold(page, title) {
  const card = kpiCard(page, title);
  await smoothScroll(page, card);
  const subtitle = card.locator("h3 + p").first();
  await subtitle.waitFor({ state: "visible", timeout: 15_000 });
  await zoomIn(page, unionBox(await card.locator("h3").first().boundingBox(), await subtitle.boundingBox()), {
    max: 2.2,
    pad: 20,
  });
  await hold(page, 2200);
  await zoomOut(page);
  await zoomIn(page, card, { max: 1.5 });
  await hold(page, 1600);
  // Level memakai <select> bawaan: daftar pilihannya tidak ikut terekam, jadi
  // kursor diarahkan ke kotaknya lalu nilainya diganti langsung.
  const level = card.locator('select[title="Level Akreditasi"]');
  await glideTo(page, level);
  await hold(page, 400);
  await level.selectOption("unggul");
  await hold(page, 2600);
  await zoomOut(page);
}

/**
 * Tooltip radar Recharts: Recharts memilih sumbu menurut sudut kursor dari
 * pusat, jadi kursor diletakkan di antara pusat grid dan label sumbu.
 */
async function radarTooltip(page, title, axisLabel, ms) {
  const card = kpiCard(page, title);
  await smoothScroll(page, card);
  const grid = card.locator(".recharts-polar-grid").first();
  await grid.waitFor({ state: "visible", timeout: 30_000 });
  const g = await grid.boundingBox();
  const label = card.locator(".recharts-polar-angle-axis-tick text", { hasText: axisLabel }).first();
  const l = await label.boundingBox();
  const cx = g.x + g.width / 2;
  const cy = g.y + g.height / 2;
  const lx = l.x + l.width / 2;
  const ly = l.y + l.height / 2;
  await tooltipAt(page, card, cx + (lx - cx) * 0.6, cy + (ly - cy) * 0.6, ms);
}

// ─── Insight ─────────────────────────────────────────────────────────────────

const controls = (page) => page.getByRole("region", { name: "Susun analisis" });

const fieldTrigger = (page, labelRe) =>
  controls(page)
    .locator("div.flex-col")
    .filter({ has: page.locator(":scope > label", { hasText: labelRe }) })
    .locator(":scope > button")
    .first();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Kamera mendekat ke tombol pemilih yang diklik beserta popover pilihannya. */
async function focusPicker(page, trigger, popover) {
  await popover.waitFor({ state: "visible", timeout: 15_000 });
  await hold(page, 150);
  await zoomIn(page, unionBox(await trigger.boundingBox(), await popover.boundingBox()), { max: 2.1, pad: 16 });
}

async function pickMeasure(page, label) {
  const trigger = fieldTrigger(page, /^\s*dihitung/i);
  await clickSmooth(page, trigger);
  const dialog = page.getByRole("dialog").last();
  await focusPicker(page, trigger, dialog);
  const item = dialog
    .locator("label")
    .filter({ hasText: new RegExp(`^\\s*${escapeRe(label)}`) })
    .first();
  await clickSmooth(page, item);
  await hold(page, 400);
  await page.keyboard.press("Escape");
  await zoomOut(page);
  await settle(page);
}

async function pickDimension(page, labelRe, search, option) {
  const trigger = fieldTrigger(page, labelRe);
  await clickSmooth(page, trigger);
  const dialog = page.getByRole("dialog").last();
  await focusPicker(page, trigger, dialog);
  await typeSlow(page, dialog.getByPlaceholder("Cari dimensi…"), search);
  await clickSmooth(page, dialog.getByText(option, { exact: true }).first());
  await zoomOut(page);
  await settle(page);
}

async function pickViz(page, name) {
  await clickSmooth(page, page.locator(`[aria-label="Jenis visualisasi"] [aria-label="${name}"]`));
  await settle(page);
}

/** Blok hasil terkecil yang memuat pemilih visual sekaligus grafik/tabelnya. */
const resultArea = (page) =>
  page.locator('[aria-label="Jenis visualisasi"]').locator("xpath=ancestor::div[.//canvas or .//table][1]");

/** Kartu grafik Insight (Recharts) yang memuat pemilih visual. */
const insightChart = (page) =>
  page
    .locator('[aria-label="Jenis visualisasi"]')
    .locator('xpath=ancestor::div[.//*[contains(@class, "recharts-wrapper")]][1]');

/**
 * Sorot satu nilai di grafik Insight lewat tooltip-nya: `which` = indeks
 * batang (urutan Recharts: per seri, lalu per kategori) atau "max" untuk
 * batang tertinggi. Grafik selebar layar tidak bisa di-zoom utuh dengan
 * berarti, jadi yang didekati adalah tooltip nilai yang ingin ditunjukkan.
 */
async function insightTooltip(page, which = "max", ms = 2400) {
  const chart = insightChart(page);
  await smoothScroll(page, chart);
  const bars = chart.locator(".recharts-bar-rectangle");
  await bars.first().waitFor({ state: "visible", timeout: 30_000 });
  await hold(page, 600); // animasi batang
  const boxes = await bars.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  const i =
    which === "max"
      ? boxes.reduce((best, b, k) => (b.height > boxes[best].height ? k : best), 0)
      : which < 0
        ? boxes.length + which
        : which;
  const b = boxes[i];
  await tooltipAt(page, chart, b.x + b.width / 2, b.y + Math.min(b.height / 2, 16), ms);
}

/** Sorot satu baris peta panas: label baris sampai sel yang dimaksud. */
async function heatRowFocus(page, rowLabel, cellPrefix, ms = 2000) {
  const cell = heatCell(page, cellPrefix);
  await smoothScroll(page, cell);
  const label = page
    .locator("tr")
    .filter({ has: cell })
    .locator("td, th")
    .first();
  await glideTo(page, cell);
  await zoomIn(page, unionBox(await label.boundingBox(), await cell.boundingBox()), { max: 2.2, pad: 20 });
  await hold(page, ms);
  await zoomOut(page);
}

async function toggleSwitch(page, label, on = true) {
  const sw = page.locator(`[aria-label="${label}"]`);
  const checked = (await sw.getAttribute("aria-checked")) === "true";
  if (checked !== on) await clickSmooth(page, sw);
  await settle(page);
}

async function advancedMode(page) {
  await clickSmooth(page, page.locator('button[title="Atur tampilan"]'));
  await toggleSwitch(page, "Mode analisis lanjutan", true);
  await page.keyboard.press("Escape");
  await hold(page, 300);
}

async function resetInsight(page) {
  await clickSmooth(page, page.getByRole("button", { name: "Reset", exact: true }));
  await settle(page);
}

/** Dialog operasi OLAP yang muncul saat titik/sel diklik di mode lanjutan. */
const pointDialog = (page) => page.getByRole("dialog").filter({ hasText: "Mau diapakan kelompok ini?" });

/** Klik sel/titik, lalu pilih operasi OLAP (`action` = regex teks tombol). */
async function pointAction(page, target, action, { look = 1400 } = {}) {
  await smoothScroll(page, target);
  await clickSmooth(page, target);
  const dialog = pointDialog(page);
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  await zoomIn(page, dialog, { max: 2.2, pad: 16 });
  await hold(page, look);
  await clickSmooth(page, dialog.getByRole("button", { name: action }).first());
  await zoomOut(page);
  await settle(page);
}

/** Sel heatmap berdasarkan awal title-nya ("Baris · Kolom: nilai"). */
const heatCell = (page, prefix) => page.locator(`td button[title^="${prefix}"]`).first();

/** Sel angka di tabel pivot pada baris berlabel `rowLabel`. */
const tableCell = (page, rowLabel) =>
  page
    .locator("tr")
    .filter({ has: page.locator("td, th").filter({ hasText: new RegExp(`^\\s*${escapeRe(rowLabel)}\\s*$`) }) })
    .locator('button[title="Lihat daftar alumninya"]')
    .first();

async function rollUp(page) {
  await clickSmooth(page, page.getByRole("button", { name: "Naik", exact: true }));
  await settle(page);
}

/** Dice lewat panel Batasi: tambah batasan pada `dimension` dengan beberapa nilai. */
async function diceBy(page, search, dimension, values) {
  await clickSmooth(page, fieldTrigger(page, /^\s*batasi/i));
  const panel = page.getByRole("dialog").filter({ hasText: "Batasi data ke" });
  await clickSmooth(page, panel.getByText("Tambah batasan"));
  const picker = page.getByRole("dialog").last();
  await typeSlow(page, picker.getByPlaceholder("Cari dimensi…"), search);
  await clickSmooth(page, picker.getByText(dimension, { exact: true }).first());
  await hold(page, 400);
  const combo = panel.getByRole("combobox").last();
  await clickSmooth(page, combo);
  const list = page.getByRole("dialog").last();
  await focusPicker(page, panel, list);
  for (const v of values) {
    await clickSmooth(page, list.getByRole("button", { name: v, exact: true }));
    await settle(page);
  }
  await hold(page, 1200);
  await page.keyboard.press("Escape");
  await zoomOut(page);
  await hold(page, 200);
  await page.keyboard.press("Escape");
  await settle(page);
}

const mode3D = (page, label) =>
  page.locator('[aria-label="Grafik 2D atau 3D"]').getByText(label, { exact: true });

/** Kotak nilai yang muncul saat batang 3D disorot. */
const hover3D = (card) => card.locator("div.pointer-events-none.absolute.whitespace-nowrap.rounded-md");

/**
 * Cari titik layar sebuah batang 3D bernilai tertinggi. Batang digambar di
 * kanvas WebGL sehingga posisinya tidak bisa dibaca dari DOM; pencarian
 * dilakukan dengan menyapu kanvas, tetapi di balik gambar diam kartu itu dan
 * dengan kursor tiruan disembunyikan, supaya penonton tidak melihat kursor
 * berlarian atau batang berkedip.
 */
async function find3DBar(page, card, canvas) {
  const cardBox = await card.boundingBox();
  const snap = (await card.screenshot()).toString("base64");
  await page.evaluate(
    ({ b, src }) => {
      const img = document.createElement("img");
      img.id = "__demo-freeze";
      img.src = `data:image/png;base64,${src}`;
      Object.assign(img.style, {
        position: "fixed", left: `${b.x}px`, top: `${b.y}px`, width: `${b.width}px`,
        height: `${b.height}px`, zIndex: "2147483640", pointerEvents: "none",
      });
      document.documentElement.appendChild(img);
      const c = document.getElementById("__demo-cursor");
      if (c) c.style.visibility = "hidden";
    },
    { b: cardBox, src: snap },
  );

  const c = await canvas.boundingBox();
  const tip = hover3D(card);
  let best = null;
  for (let fy = 0.3; fy <= 0.85; fy += 0.08) {
    for (let fx = 0.12; fx <= 0.88; fx += 0.06) {
      const x = c.x + c.width * fx;
      const y = c.y + c.height * fy;
      await page.mouse.move(x, y);
      await page.waitForTimeout(35);
      if (!(await tip.isVisible().catch(() => false))) continue;
      const text = (await tip.innerText().catch(() => "")) ?? "";
      const m = text.match(/Rp\s?([\d.]+)/);
      const value = m ? Number(m[1].replace(/\./g, "")) : 0;
      if (!best || value > best.value) best = { x, y, value };
    }
  }

  const back = cursorPos();
  await page.mouse.move(back.x, back.y);
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    document.getElementById("__demo-freeze")?.remove();
    const cur = document.getElementById("__demo-cursor");
    if (cur) cur.style.visibility = "";
  });
  return best;
}

/** Bar chart 3D: tampilkan, sorot SATU batang bernilai tertinggi, lalu kembali ke 2D. */
async function show3D(page) {
  await clickSmooth(page, mode3D(page, "3D"));
  // Di mode 3D pemilih visual disembunyikan; kartu grafik dicari dari tombol 2D/3D.
  const card = page.locator('[aria-label="Grafik 2D atau 3D"]').locator("xpath=ancestor::div[.//canvas][1]");
  const canvas = card.locator("canvas").first();
  await page.getByText("Memuat grafik 3D…").waitFor({ state: "hidden", timeout: 30_000 });
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  await smoothScroll(page, card);
  await page.waitForTimeout(1500); // animasi masuk echarts-gl harus selesai sebelum dipotret
  const bar = await find3DBar(page, card, canvas);
  console.log(`  3D: batang ${bar ? `Rp${bar.value.toLocaleString("id-ID")} di (${bar.x.toFixed(0)}, ${bar.y.toFixed(0)})` : "tidak ditemukan"}`);
  if (bar) {
    await glideToPoint(page, bar.x, bar.y, 900);
    await hold(page, 600);
    const tip = await hover3D(card).boundingBox().catch(() => null);
    const point = { x: bar.x - 18, y: bar.y - 18, width: 36, height: 36 };
    await zoomIn(page, tip ? unionBox(tip, point) : point, { max: 2.6, pad: 28 });
    await hold(page, 2000);
    await zoomOut(page);
  } else {
    await hold(page, 2000);
  }
  await clickSmooth(page, mode3D(page, "2D"));
  await settle(page);
}

// ─── Anggaran waktu per segmen ───────────────────────────────────────────────

const log = [];
async function segment(page, name, budgetSec, fn) {
  const t0 = Date.now();
  console.log(`▶ ${name} (anggaran ${budgetSec}s)`);
  await fn();
  const used = (Date.now() - t0) / 1000;
  const rest = budgetSec - used;
  if (!FAST && rest > 0) await page.waitForTimeout(rest * 1000);
  if (rest < 0) console.warn(`  ! ${name} lewat ${(-rest).toFixed(1)}s dari anggaran`);
  log.push({ name, budgetSec, used: +used.toFixed(1) });
}

// ─── Skenario ────────────────────────────────────────────────────────────────

async function main() {
  console.log("Login akun demo…");
  const sessions = {
    kotc: await login(ACCOUNTS.kotc),
    kaprodi: await login(ACCOUNTS.kaprodi),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const rawDir = path.join(OUT_DIR, "raw");
  const browser = await chromium.launch({
    channel: process.env.DEMO_CHANNEL ?? "chrome",
    headless: process.env.HEADED !== "1",
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: "id-ID",
    ...(FAST ? {} : { recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } } }),
  });
  await installOverlay(context);
  const page = await context.newPage();
  // Video Playwright mulai saat halaman dibuat; jam zoom dan potongan awal
  // memakai titik nol yang sama.
  const clockZero = Date.now();
  markClock();

  // Halaman pertama hanya untuk origin localStorage; tirai menutupinya dan
  // potongan awal video dibuang saat konversi.
  await page.goto(`${BASE}/login`);
  await veil(page);
  let trimStart = 0;

  try {
    // ── Sekilas dashboard: satu tooltip per halaman ─────────────────────────
    await segment(page, "Overview", 8, async () => {
      // Video dimulai tepat saat tirai pertama dibuka.
      await open(page, "/dashboard/overview", sessions.kotc, () => {
        trimStart = (Date.now() - clockZero) / 1000;
      });
      await barTooltip(page, "Response Rate per Program Studi", 0, 2200);
    });

    // ── Employment Outcome: threshold akreditasi satu prodi ────────────────
    // D-3 Teknik Elektronika (LAM Teknik – Diploma Tiga): semua angkatan lolos
    // Baik 60%, tetapi baru 2023–2024 yang lolos Unggul 80% — saat level dinaikkan,
    // batang 2019–2022 berubah oranye sehingga perbedaan warnanya terlihat.
    await segment(page, "Employment · threshold LAM", 34, async () => {
      await navigate(page, "/dashboard/employment");
      await pickGlobalFilter(page, "Jurusan", "Teknik Elektro");
      await pickGlobalFilter(page, "Prodi", "D-3 Teknik Elektronika");
      await clickSmooth(page, page.getByRole("button", { name: /Terapkan/ }));
      await settle(page);
      await openTab(page, "Kesesuaian Bidang");
      await showThreshold(page, "Kesesuaian Bidang Kerja per Angkatan");
      await barTooltip(page, "Kesesuaian Bidang Kerja per Angkatan", -2, 2400); // angkatan 2023
    });

    // ── Insight: gaji × jenis × level perusahaan ────────────────────────────
    await segment(page, "Insight · gaji × jenis × level", 40, async () => {
      await navigate(page, "/dashboard/insight");
      await pickMeasure(page, "Rata-rata gaji");
      await pickDimension(page, /^\s*per\b/i, "jenis", "Jenis instansi");
      await pickDimension(page, /^\s*dibandingkan/i, "tingkat", "Tingkat instansi");
      // Batang per jenis instansi: sorot BUMN/BUMD (kategori pertama).
      await pickViz(page, "Batang");
      await insightTooltip(page, 0, 2000);
      await show3D(page);
      await pickViz(page, "Peta panas");
    });

    // ── Slice lalu Dice ─────────────────────────────────────────────────────
    await segment(page, "Insight · slice BUMN + dice angkatan", 42, async () => {
      await advancedMode(page);
      // Slice: hanya BUMN/BUMD → Jenis instansi keluar dari tampilan.
      await pointAction(page, heatCell(page, "BUMN/BUMD · Nasional"), /^Slice: hanya Jenis instansi/);
      await pickViz(page, "Batang");
      await insightTooltip(page, "max", 2000);
      // Dice: BUMN/BUMD × angkatan 2023 & 2024, dipecah per provinsi kerja.
      await diceBy(page, "tahun", "Tahun lulus", ["2023", "2024"]);
      await pickDimension(page, /^\s*per\b/i, "provinsi", "Provinsi tempat kerja");
      await pickViz(page, "Peta panas");
      await heatRowFocus(page, "Prov. Jawa Barat", "Prov. Jawa Barat · Nasional", 2000);
    });

    // ── Drill-down & roll-up lokasi: Provinsi → Kota ────────────────────────
    await segment(page, "Insight · provinsi → kota", 22, async () => {
      await pointAction(page, heatCell(page, "Prov. Jawa Barat · Nasional"), /^Drill-down:/);
      // Kota-kota Jawa Barat sebagai batang: sorot rata-rata gaji tertinggi.
      await pickViz(page, "Batang");
      await insightTooltip(page, "max", 2000);
      await rollUp(page);
      await hold(page, 1200);
    });

    // ── Drill-down & roll-up program studi: Jurusan → Jenjang → Prodi ───────
    await segment(page, "Insight · jurusan → jenjang → prodi", 46, async () => {
      await resetInsight(page);
      await pickMeasure(page, "Rata-rata gaji");
      await pickDimension(page, /^\s*per\b/i, "jurusan", "Jurusan");
      await pickViz(page, "Batang");
      await pointAction(page, tableCell(page, "Teknik Konversi Energi"), /^Drill-down:/);
      await insightTooltip(page, -1, 1800); // D4
      await pointAction(page, tableCell(page, "D4"), /^Drill-down:/);
      await insightTooltip(page, "max", 2000); // prodi D4 bergaji tertinggi
      await rollUp(page);
      await hold(page, 800);
      await rollUp(page);
      await hold(page, 1200);
    });

    // ── Educational Assessment (Koordinator Prodi) ──────────────────────────
    await segment(page, "Educational Assessment", 28, async () => {
      // Ganti akun ke Kaprodi di balik tirai, lalu buka halaman lewat sidebar.
      await open(page, "/dashboard/overview", sessions.kaprodi);
      await navigate(page, "/dashboard/education");
      await radarTooltip(page, "Analisis Gap Kompetensi Lulusan", "Etika", 3200);
      await hold(page, 500);
      await radarTooltip(page, "Analisis Gap Kompetensi Lulusan", "Kerja sama tim", 2000);
      await openTab(page, "Persepsi Metode Pembelajaran");
      await radarTooltip(page, "Persepsi Alumni terhadap Metode Pembelajaran", "Magang", 3000);
    });

    await segment(page, "Penutup", 2, async () => {
      await veil(page);
    });
  } catch (err) {
    await page.screenshot({ path: path.join(OUT_DIR, "error.png") }).catch(() => {});
    throw err;
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    console.table(log);
    const total = log.reduce((s, l) => s + Math.max(l.used, FAST ? 0 : l.budgetSec), 0);
    console.log(`Perkiraan durasi: ${total.toFixed(1)}s (batas ${MAX_SECONDS}s)`);

    if (video) {
      const raw = await video.path();
      const webm = path.join(OUT_DIR, "demo-tracer-study.webm");
      renameSync(raw, webm);
      rmSync(rawDir, { recursive: true, force: true });

      // Zoom halus (sub-piksel, smootherstep, zoom berdekatan disambung) oleh
      // camera.py; batas keras 4 menit tetap dijaga di sana.
      const events = path.join(OUT_DIR, "zoom-events.json");
      writeFileSync(events, JSON.stringify({ trim: trimStart, max_seconds: MAX_SECONDS, events: zoomEvents() }, null, 1));
      const mp4 = path.join(OUT_DIR, "demo-tracer-study.mp4");
      const cam = spawnSync("python3", [path.join(HERE, "camera.py"), webm, events, mp4], { stdio: "inherit" });
      if (cam.status !== 0) throw new Error("camera.py gagal; rekaman mentah ada di " + webm);
      console.log(`\nSelesai: ${mp4}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
