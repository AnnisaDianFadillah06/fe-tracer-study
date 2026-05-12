/**
 * Backward-compat entry point: mengarahkan semua import lama
 * (`import { useAuth } from "@/hooks/useAuth"`) ke `AuthContext`.
 *
 * Sumber kebenaran tunggal untuk state auth ada di `src/contexts/AuthContext.tsx`.
 * File ini dipertahankan agar 6 consumer tidak perlu update import path.
 */
export { useAuthContext as useAuth, type AuthUser } from "@/contexts/AuthContext";
