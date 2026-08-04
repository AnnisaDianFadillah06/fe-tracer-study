import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Pre-bundle SEMUA dependency runtime saat dev server start.
  //
  // Tanpa ini, Vite hanya mem-prebundle dependency yang terjangkau dari
  // entry point saat start. Begitu kita berpindah halaman ke komponen yang
  // memakai dependency baru (mis. StaffManagementPage -> @radix-ui/react-switch),
  // Vite menemukan dependency itu di tengah jalan, menjalankan re-optimize,
  // lalu memaksa full reload. Selama proses itu React sudah keburu unmount
  // sehingga layar jadi PUTIH KOSONG, dan baru pulih setelah user refresh
  // manual. Itulah gejala "halaman staff-management selalu putih".
  //
  // Daftar di bawah sengaja ditulis lengkap (bukan hasil scan otomatis)
  // supaya penambahan dependency baru terlihat eksplisit di code review.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "axios",
      "@tanstack/react-query",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "zod",
      "recharts",
      "lucide-react",
      "date-fns",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "next-themes",
      "sonner",
      "cmdk",
      "vaul",
      "input-otp",
      "embla-carousel-react",
      "react-day-picker",
      "react-resizable-panels",
      "exceljs",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
    ],
  },
}));
