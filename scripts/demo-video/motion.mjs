// Helper motion untuk rekaman demo: kursor tiruan, riak klik, gerak mouse
// melengkung, tirai transisi, dan catatan zoom kamera. Overlay dipasang lewat
// addInitScript sehingga kode aplikasi tidak disentuh sama sekali.
//
// Zoom tidak dikerjakan di browser (sidebar `fixed` dan header `sticky` akan
// bergeser bila <body> di-transform), melainkan dicatat di sini lalu
// diterapkan saat pasca-proses oleh camera.py (lihat zoomEvents).

export const FAST = process.env.FAST === "1";
const SPEED = FAST ? 0.15 : 1;

/** Jeda yang ikut dipercepat di mode FAST (uji coba selector). */
export const hold = (page, ms) => page.waitForTimeout(Math.max(30, Math.round(ms * SPEED)));

// ─── Overlay di dalam halaman ────────────────────────────────────────────────

const overlayScript = () => {
  const Z = 2147483647;
  const css = `
    #__demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:${Z};
      pointer-events:none;transform:translate(-3px,-2px);will-change:left,top;
      filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
    .__demo-ripple{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;
      border:3px solid rgba(37,99,235,.9);background:rgba(37,99,235,.25);z-index:${Z - 1};
      pointer-events:none;animation:__demoRipple .55s ease-out forwards}
    @keyframes __demoRipple{to{transform:scale(3.4);opacity:0}}
    #__demo-veil{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:${Z - 2};
      pointer-events:none;background:#f8fafc;opacity:0;transition:opacity .45s ease}
    #__demo-veil.show{opacity:1}
  `;
  const cursorSvg = `<svg viewBox="0 0 26 26" width="26" height="26"><path d="M3 2 L3 21 L8.5 16 L12 24 L15.5 22.5 L12 14.8 L19.5 14.8 Z"
    fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

  const veilEl = () => {
    let el = document.getElementById("__demo-veil");
    if (!el) {
      el = document.createElement("div");
      el.id = "__demo-veil";
      document.documentElement.appendChild(el);
    }
    return el;
  };

  window.__demo = {
    veil(instant = false) {
      sessionStorage.setItem("__demoVeil", "1");
      const el = veilEl();
      if (instant) el.style.transition = "none";
      el.classList.add("show");
      if (instant) requestAnimationFrame(() => (el.style.transition = ""));
    },
    unveil() {
      sessionStorage.removeItem("__demoVeil");
      document.getElementById("__demo-veil")?.classList.remove("show");
    },
  };

  const mount = () => {
    const root = document.documentElement;
    if (!root || document.getElementById("__demo-style")) return;
    const style = document.createElement("style");
    style.id = "__demo-style";
    style.textContent = css;
    root.appendChild(style);

    const cursor = document.createElement("div");
    cursor.id = "__demo-cursor";
    cursor.innerHTML = cursorSvg;
    const last = JSON.parse(sessionStorage.getItem("__demoPos") || "[960,540]");
    cursor.style.left = `${last[0]}px`;
    cursor.style.top = `${last[1]}px`;
    root.appendChild(cursor);

    // Tirai tetap menutup selama halaman dimuat ulang (ganti peran), agar
    // layar memuat tidak ikut terekam.
    if (sessionStorage.getItem("__demoVeil")) window.__demo.veil(true);
  };

  document.addEventListener(
    "mousemove",
    (e) => {
      const c = document.getElementById("__demo-cursor");
      if (!c) return;
      c.style.left = `${e.clientX}px`;
      c.style.top = `${e.clientY}px`;
      sessionStorage.setItem("__demoPos", JSON.stringify([e.clientX, e.clientY]));
    },
    true,
  );
  document.addEventListener(
    "mousedown",
    (e) => {
      const r = document.createElement("div");
      r.className = "__demo-ripple";
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 600);
    },
    true,
  );

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
};

export const installOverlay = (context) => context.addInitScript(overlayScript);

export async function veil(page) {
  await page.evaluate(() => window.__demo?.veil());
  await page.waitForTimeout(500);
}

export async function unveil(page) {
  await page.evaluate(() => window.__demo?.unveil());
  await page.waitForTimeout(500);
}

// ─── Gerak mouse ─────────────────────────────────────────────────────────────

// Posisi kursor dicatat di sisi Node karena page.mouse tidak bisa ditanya.
const pos = { x: 960, y: 540 };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Geser kursor ke titik (x, y) lewat kurva Bezier kuadratik yang sedikit melengkung. */
export async function glideToPoint(page, x, y, ms = 750) {
  const dx = x - pos.x;
  const dy = y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return;
  const duration = FAST ? 60 : Math.min(1100, Math.max(350, ms * Math.min(1, dist / 900 + 0.35)));
  // Titik kendali digeser tegak lurus lintasan agar geraknya tidak kaku lurus.
  const bend = Math.min(120, dist * 0.18) * (Math.random() < 0.5 ? -1 : 1);
  const cx = pos.x + dx / 2 - (dy / (dist || 1)) * bend;
  const cy = pos.y + dy / 2 + (dx / (dist || 1)) * bend;
  const sx = pos.x;
  const sy = pos.y;
  // Dikendalikan jam, bukan jumlah langkah: saat perekaman membuat tiap
  // mouse.move lambat, gerakan tetap selesai dalam `duration` (langkahnya saja
  // yang lebih jarang), sehingga anggaran waktu segmen tidak molor.
  const t0 = Date.now();
  for (;;) {
    const raw = Math.min(1, (Date.now() - t0) / duration);
    const t = easeInOut(raw);
    const px = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * x;
    const py = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * y;
    await page.mouse.move(px, py);
    if (raw >= 1) break;
    await page.waitForTimeout(12);
  }
  pos.x = x;
  pos.y = y;
}

/** Posisi kursor saat ini (versi Node; dipakai untuk mengembalikannya). */
export const cursorPos = () => ({ x: pos.x, y: pos.y });

async function boxOf(locator) {
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Elemen tidak punya posisi: ${locator}`);
  return box;
}

/** Gulir halus sampai elemen ada di posisi `block` layar. */
export async function smoothScroll(page, locator, block = "center") {
  await locator.waitFor({ state: "attached", timeout: 30_000 });
  await locator.evaluate((el, b) => el.scrollIntoView({ behavior: "smooth", block: b }), block);
  // Tunggu sampai gulirannya benar-benar berhenti (posisi elemen tidak
  // berubah lagi); posisi yang diukur di tengah guliran membuat klik meleset.
  let last = null;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(100);
    const y = (await locator.boundingBox())?.y ?? null;
    if (last !== null && y !== null && Math.abs(y - last) < 0.5) break;
    last = y;
  }
  await hold(page, 300);
}

export async function glideTo(page, locator, ms) {
  await locator.scrollIntoViewIfNeeded();
  // Elemen bisa "terlihat" tapi tertutup pita filter sticky; bila titik
  // tengahnya dimiliki elemen lain, gulir sampai elemen ada di tengah layar.
  const covered = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !hit || !(el === hit || el.contains(hit) || hit.contains(el));
  });
  if (covered) await smoothScroll(page, locator);
  const box = await boxOf(locator);
  await glideToPoint(page, box.x + box.width / 2, box.y + box.height / 2, ms);
}

/** Geser ke elemen, berhenti sebentar, lalu klik (riak muncul dari mousedown). */
export async function clickSmooth(page, locator, { pause = 220 } = {}) {
  await glideTo(page, locator);
  await hold(page, pause);
  await page.mouse.down();
  await page.waitForTimeout(70);
  await page.mouse.up();
  await hold(page, 220);
}

export async function typeSlow(page, locator, text) {
  // DimensionPicker menyimpan teks pencarian sebelumnya; kosongkan dulu.
  await locator.fill("");
  await locator.pressSequentially(text, { delay: FAST ? 5 : 80 });
  await hold(page, 300);
}

/** Sapu kursor melintasi grafik dari kiri ke kanan agar tooltip bergantian muncul. */
export async function hoverSweep(page, locator, { ms = 2400, yRatio = 0.55, points = 5 } = {}) {
  const box = await boxOf(locator);
  const y = box.y + box.height * yRatio;
  for (let i = 0; i < points; i++) {
    const x = box.x + box.width * (0.12 + (0.76 * i) / Math.max(1, points - 1));
    await glideToPoint(page, x, y, 400);
    await hold(page, ms / points);
  }
}

/** Seret di atas kanvas (memutar kamera grafik 3D). */
export async function drag(page, locator, dx, dy, ms = 1600) {
  const box = await boxOf(locator);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await glideToPoint(page, x, y);
  await page.mouse.down();
  const t0 = Date.now();
  const dur = FAST ? 100 : ms;
  for (;;) {
    const raw = Math.min(1, (Date.now() - t0) / dur);
    const t = easeInOut(raw);
    await page.mouse.move(x + dx * t, y + dy * t);
    if (raw >= 1) break;
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  pos.x = x + dx;
  pos.y = y + dy;
}

// ─── Zoom kamera (diterapkan di pasca-proses) ────────────────────────────────

const VW = 1920;
const VH = 1080;
const RAMP = 1.0; // detik masuk/keluar zoom — samakan dengan RAMP di camera.py
const zooms = [];
let clockStart = Date.now();
let openZoom = null;

/** Titik nol jam zoom = awal rekaman video. */
export const markClock = () => (clockStart = Date.now());
const now = () => (Date.now() - clockStart) / 1000;

/**
 * Mulai zoom ke area `target` (locator atau kotak koordinat viewport). Skala
 * dipilih agar area itu memenuhi ±92% layar, dibatasi `max`. Akhiri dengan
 * zoomOut; zoom berikutnya otomatis menutup yang masih terbuka.
 */
export async function zoomIn(page, target, { max = 1.8, pad = 24 } = {}) {
  if (openZoom) await zoomOut(page);
  const box = typeof target.boundingBox === "function" ? await boxOf(target) : target;
  // Bagian elemen di luar layar tidak ikut dihitung.
  const top = Math.max(0, box.y - pad);
  const bottom = Math.min(VH, box.y + box.height + pad);
  const left = Math.max(0, box.x - pad);
  const right = Math.min(VW, box.x + box.width + pad);
  const w = Math.max(200, right - left);
  const h = Math.max(120, bottom - top);
  const scale = Math.max(1.05, Math.min(max, 0.92 * Math.min(VW / w, VH / h)));
  openZoom = { start: now(), scale, cx: (left + right) / 2, cy: (top + bottom) / 2 };
  await hold(page, RAMP * 1000);
}

export async function zoomOut(page) {
  if (!openZoom) return;
  zooms.push({ ...openZoom, end: now() });
  openZoom = null;
  await hold(page, RAMP * 1000);
}

/** Zoom ke elemen, tahan, lalu kembali. */
export async function zoomOn(page, target, ms = 2500, opts) {
  await zoomIn(page, target, opts);
  await hold(page, ms);
  await zoomOut(page);
}

/**
 * Semua zoom tercatat, untuk camera.py: waktu relatif terhadap awal rekaman
 * (markClock), skala, dan titik pusat dalam koordinat viewport 1920×1080.
 */
export function zoomEvents() {
  if (openZoom) zooms.push({ ...openZoom, end: now() });
  openZoom = null;
  return zooms.map((z) => ({ start: z.start, end: z.end, scale: z.scale, cx: z.cx, cy: z.cy }));
}
