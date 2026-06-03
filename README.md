# FE Tracer Study

Frontend aplikasi **Tracer Study** untuk kebutuhan pengisian kuesioner alumni serta dashboard/management untuk role tertentu. Dibangun menggunakan **React + TypeScript** dengan tooling **Vite**, styling **Tailwind CSS**, dan komponen UI berbasis **shadcn-ui**.

---

## Tech Stack

- **Vite** (build tool)
- **React** + **TypeScript**
- **Tailwind CSS**
- **shadcn-ui**

---

## Cara Menjalankan Project (Local Development)

### 1) Clone
```bash
git clone <YOUR_GIT_URL>
cd fe-tracer-study
```

### 2) Install dependencies
Pilih salah satu:

**Menggunakan npm**
```bash
npm install
```

### 3) Run dev server
**npm**
```bash
npm run dev
```

Aplikasi akan berjalan di URL dev server yang ditampilkan di terminal (umumnya `http://localhost:5173`).

---

## Struktur Folder (Ringkasan)

Struktur utama berada di `src/`:

```text
src/
  App.tsx
  main.tsx
  App.css
  index.css
  vite-env.d.ts

  pages/
    Landing.tsx
    Login.tsx
    LoginWithAPI.tsx
    StudentLoginPage.tsx
    ProfilePage.tsx
    ChangePasswordPage.tsx
    ComparePage.tsx

    FormPage.tsx
    FormPreviewPage.tsx
    FormBuilderPage.tsx
    FormManagementPage.tsx

    StudentManagementPage.tsx
    TeamManagementPage.tsx
    NotFound.tsx

    dashboard/
      overview/
      analytics/
      education/
      employment/

  components/
    NavLink.tsx
    PolbanLogo.tsx
    ProtectedRoute.tsx
    ThemeProvider.tsx
    ThemeToggle.tsx

    landing/
    dashboard/
    ui/

  contexts/
    RoleContext.tsx

  hooks/
    useAuth.ts
    useStudentAuth.ts
    useFormResponse.ts
    useQuestionManagement.ts
    useStudentManagement.ts
    use-mobile.tsx
    use-toast.ts

    dashboard/
      kaprodi/
      kotc/
      p2mpp/

  lib/
    apiClient.ts
    formManagement.ts
    mockData.ts
    utils.ts
```

---

## Penjelasan Singkat Tiap Layer/Folder

### `src/pages/`
Berisi halaman (route-level pages), misalnya:
- Auth & landing: `Landing.tsx`, `Login.tsx`, `LoginWithAPI.tsx`, `StudentLoginPage.tsx`
- Profil & akun: `ProfilePage.tsx`, `ChangePasswordPage.tsx`
- Form/kuesioner: `FormPage.tsx`, `FormPreviewPage.tsx`, `FormBuilderPage.tsx`, `FormManagementPage.tsx`
- Manajemen: `StudentManagementPage.tsx`, `TeamManagementPage.tsx`
- Dashboard (dikelompokkan lagi): `pages/dashboard/*`
- Fallback: `NotFound.tsx`

### `src/components/`
Komponen reusable.
- Navigation: `NavLink.tsx`
- Branding: `PolbanLogo.tsx`
- Proteksi route: `ProtectedRoute.tsx`
- Tema: `ThemeProvider.tsx`, `ThemeToggle.tsx`
- Subfolder:
  - `components/ui/` → komponen UI (shadcn-ui)
  - `components/landing/` → komponen khusus landing page
  - `components/dashboard/` → komponen khusus dashboard

### `src/hooks/`
Custom hooks untuk logic yang dipakai ulang:
- `useAuth.ts`, `useStudentAuth.ts` → autentikasi
- `useStudentManagement.ts` → fitur manajemen mahasiswa/alumni (sesuai kebutuhan sistem)
- `useQuestionManagement.ts` → pengelolaan pertanyaan (form builder/management)
- `useFormResponse.ts` → pengisian/submit/jawaban form
- `hooks/dashboard/*` → hook khusus dashboard berdasarkan role (mis. `kaprodi`, `kotc`, `p2mpp`)
- Utility hooks: `use-toast.ts`, `use-mobile.tsx`

### `src/contexts/`
Context React untuk state global berbasis Context API.
- `RoleContext.tsx` → menyimpan/mengelola role user untuk kebutuhan akses/fitur.

### `src/lib/`
Utilitas dan helper yang sifatnya “library” internal:
- `apiClient.ts` → konfigurasi client untuk komunikasi API (base URL, token, interceptor, dll)
- `formManagement.ts` → helper terkait manajemen form
- `mockData.ts` → data dummy untuk development/testing UI
- `utils.ts` → fungsi utilitas kecil

---

## Konsep Role & Akses (High Level)

Repo ini mengindikasikan adanya pemisahan fitur berdasarkan role, misalnya:
- Akses dashboard/fitur tertentu per role (terlihat dari `RoleContext` dan `hooks/dashboard/{kaprodi,kotc,p2mpp}`)
- Proteksi route menggunakan `ProtectedRoute`

## Konfigurasi Penting

File konfigurasi utama di root:
- `vite.config.ts` → konfigurasi Vite
- `tailwind.config.ts`, `postcss.config.js` → styling Tailwind
- `eslint.config.js` → linting
- `components.json` → konfigurasi shadcn-ui

---

## Deployment

Tergantung platform yang kamu pakai (Vercel/Netlify/Render/dll). Untuk umum:
- Build: `npm run build`
- Preview hasil build: `npm run preview`

Jika kamu deploy lewat platform tertentu, cukup set:
- Build command: `npm run build`
- Output directory: `dist`

---

## Catatan Pengembangan

- Gunakan `mockData.ts` saat UI masih perlu data contoh.
- Pisahkan logic ke `hooks/` dan `lib/` agar `pages/` tetap bersih dan fokus pada rendering.

---

## License
Tentukan sesuai kebutuhan (mis. MIT) atau biarkan private/internal jika untuk proyek TA.
