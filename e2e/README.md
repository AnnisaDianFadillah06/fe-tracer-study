# E2E — Playwright Cross-Browser / Compatibility Testing

Suite ini menguji SmartTracer langsung terhadap **production**
(`https://smart-tracer.id`) -- tidak ada staging. Baca bagian *Keamanan
Data* sebelum menjalankan apa pun.

## Strategi 3 Level

Semua level memakai **file spec yang sama**; yang membedakan hanyalah tag
(`@compat`, `@smoke`) dan matriks browser yang dipilih lewat `--grep` /
`--project`.

| Level | Cakupan | Browser | Perintah |
|---|---|---|---|
| 1 -- Functional Suitability | Seluruh TC (default, tanpa filter tag) | chromium saja | `npm run test:e2e` |
| 2 -- Compatibility | TC bertag `@compat` (~40-an, kurasi lihat plan) | chromium, firefox, webkit, msedge, Mobile Chrome (Pixel 5 emulasi Android) | `npm run test:compat` |
| 3 -- Smoke | TC bertag `@smoke` (~10-15, golden path) | sama seperti Level 2 | `npm run test:smoke` |

Jalankan Level 3 setiap kali ada deployment baru ke `smart-tracer.id`.

## Setup

1. `npm install`
2. `npx playwright install --with-deps chromium firefox webkit` (msedge dan
   Mobile Chrome memakai binary chromium yang sama).

> **Kali Linux tidak didukung** untuk `webkit` dan `msedge` -- installer
> Playwright menolak eksplisit (`ERROR: cannot install on kali distribution
> -- only Ubuntu and Debian are supported`), dan dependency system webkit
> (`libicu74`, `libjpeg-turbo8`, dst) tidak punya padanan versi persis di
> Kali rolling meski paket setara (`libicu72/76/78`, `libjpeg62-turbo`)
> sudah terpasang -- kemungkinan ABI mismatch, bukan cuma nama paket.
> Jalankan `chromium`/`firefox`/`Mobile Chrome` dari mesin manapun; untuk
> `webkit`/`msedge` pakai mesin/CI dengan Ubuntu atau Debian 12.
3. Salin `.env.e2e.example` → `.env.e2e`, isi dengan kredensial **akun uji
   khusus** (lihat di bawah). Jangan pernah commit `.env.e2e`.
4. `npx playwright test --project=setup` untuk menghasilkan `e2e/.auth/*.json`.

## Keamanan data -- WAJIB dibaca

Karena suite ini jalan langsung ke production:

1. **Akun uji khusus saja.** `E2E_*` di `.env.e2e` harus akun yang sengaja
   dibuat untuk pengujian, bukan akun staf/alumni asli -- login otomatis
   berulang berisiko kena rate-limit atau mengotori data pengguna nyata.
2. **Prefix `TEST_`.** Test apa pun yang membuat record baru (alumni,
   kuesioner, master data) wajib memberi label dengan awalan `TEST_`
   (`TEST_PREFIX` di `e2e/fixtures/test-data.ts`) supaya mudah di-grep dan
   dibersihkan manual dari database. Suite ini **tidak** melakukan teardown
   otomatis terhadap production.
3. **Tag `@destructive` -- opt-in manual, tidak pernah otomatis.** TC yang
   melakukan hard-delete, broadcast email, atau aksi tak-terbalikkan
   lainnya tidak boleh masuk ke `test:e2e` / `test:compat` / `test:smoke`.
   Contoh dari katalog xlsx yang **sengaja tidak diotomasi**: TC-115,
   TC-121, TC-157, TC-176/177 (payload keamanan), TC-180, TC-184, TC-218,
   TC-220, TC-223 (dihindari manual testers), TC-227, TC-238 (dihindari
   manual testers), TC-277, TC-287, TC-292. TC ini tetap manual/UAT-only.

## Traceability

Judul setiap `test()` diawali `TC-<id> [FR-<id>]` sesuai kode di
`DashboardTracerStudy_TestCase_Konsolidasi(4)_Perbaikan.xlsx`, sheet
"Test Case Specification" -- untuk mencocokkan hasil report Playwright
dengan baris di katalog tanpa perlu generator xlsx→spec.

## Menambah modul baru

Ikuti pola `e2e/tests/login.spec.ts` dan `e2e/tests/kuesioner-pengisian.spec.ts`:
satu file spec per modul di katalog xlsx (`MODUL ...`), gunakan
`getByRole` / `getByLabel` / `getByText` (komponen shadcn/Radix sudah
merender ARIA role standar), dan beri tag `@compat`/`@smoke` sesuai
kurasi di plan (lihat `TC Selection Analysis` pada plan file terkait).
