import { useState } from "react";
import api from "@/lib/api";
import { clearAllDrafts } from "@/lib/formDraft";

const SESSION_KEY = "tracer_student_session";

export interface StudentSession {
  id: number;
  nim: string;
  username: string;
  email: string;
  phone: string;
  prodi: string;
  kodeProdi: string;
  angkatan: string;
  graduationYear: number | null;
}

/**
 * Hook autentikasi alumni/mahasiswa untuk mengisi kuesioner.
 *
 * Endpoint: POST /api/auth/alumni-login
 * Body: { nim_or_email, password }
 * Response: { success, data: { nim, name, email, program_name, program_code, ... } }
 *
 * Password default = NIM (sesuai backend AlumniAuthController).
 */
export const useStudentAuth = () => {
  const [session, setSession] = useState<StudentSession | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = async (nimOrEmail: string, password: string): Promise<StudentSession> => {
    const { data } = await api.post("/auth/alumni-login", {
      nim_or_email: nimOrEmail,
      password,
    });

    if (!data.success) {
      throw new Error(data.message || "Login gagal");
    }

    const alumniData = data.data;
    const studentSession: StudentSession = {
      id: alumniData.id,
      nim: alumniData.nim,
      username: alumniData.name,
      email: alumniData.email ?? "",
      phone: alumniData.phone ?? "",
      prodi: alumniData.program_name ?? "",
      kodeProdi: alumniData.program_code ?? "",
      angkatan: alumniData.entry_year ? String(alumniData.entry_year) : "",
      graduationYear: alumniData.graduation_year,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(studentSession));
    setSession(studentSession);
    return studentSession;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    // Draf pengisian memuat data pribadi (NIK, NPWP, pendapatan). Keluar
    // sesi berarti alumni selesai memakai perangkat ini — bisa jadi komputer
    // bersama — sehingga draf tidak boleh ditinggalkan.
    clearAllDrafts();
    setSession(null);
  };

  const isLoggedIn = session !== null;

  return { session, isLoggedIn, login, logout };
};
