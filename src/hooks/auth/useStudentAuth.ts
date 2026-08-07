import { useState } from "react";
import api from "@/lib/api";
import { clearAllDrafts } from "@/lib/formDraft";
import { toLoginError } from "@/lib/authErrors";

const SESSION_KEY = "tracer_student_session";
/** Kunci ini juga dibaca langsung di src/lib/api.ts — impor dari sini akan
 *  membuat siklus (useStudentAuth → api → useStudentAuth). Ubah keduanya. */
const TOKEN_KEY = "tracer_student_token";

/**
 * Token Sanctum guard 'alumni', dipakai untuk POST /api/tracer-study/submit
 * yang kini tidak lagi publik.
 *
 * Disimpan di sessionStorage, bukan localStorage: token alumni berumur pendek
 * (12 jam di backend) dan formulir sering diisi di komputer bersama, jadi
 * tokennya tidak boleh ikut hidup di tab lain atau setelah peramban ditutup.
 * Ini juga memisahkannya dari `auth_token` staff yang ada di localStorage.
 */
export const getStudentToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

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
 * Response: { success, data: { token, nim, name, email, program_name, ... } }
 *
 * Password default = NIM (sesuai backend AlumniAuthController).
 *
 * Login mengembalikan token Sanctum guard 'alumni'. Tanpa token itu, submit
 * kuesioner akan ditolak 401 oleh backend.
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
    let data: any;
    try {
      ({ data } = await api.post("/auth/alumni-login", {
        nim_or_email: nimOrEmail,
        password,
      }));
    } catch (err) {
      // Galat axios mentah dibentuk ulang supaya pemanggil menerima pesan yang
      // sama rasa dengan jalur staf — termasuk pesan pembatas laju beserta
      // sisa waktunya.
      throw toLoginError(err, "Login gagal. Periksa NIM/email dan password.");
    }

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

    if (alumniData.token) {
      sessionStorage.setItem(TOKEN_KEY, alumniData.token);
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(studentSession));
    setSession(studentSession);
    return studentSession;
  };

  const logout = () => {
    // Cabut token di server, tapi jangan tunda pembersihan lokal karenanya:
    // pemanggil langsung navigate ke /login setelah ini, dan sesi yang gagal
    // dicabut di server tetap kedaluwarsa sendiri dalam 12 jam.
    const token = getStudentToken();
    if (token) {
      api
        .post("/auth/alumni-logout", null, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {
          /* diabaikan — token lokal sudah dibuang di bawah */
        });
    }

    sessionStorage.removeItem(TOKEN_KEY);
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
