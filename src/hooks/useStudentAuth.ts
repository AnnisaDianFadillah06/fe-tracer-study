import { useState, useEffect } from "react";

const SESSION_KEY = "tracer_student_session";

export interface StudentSession {
  nim: string;
  username: string;
  email: string;
  prodi: string;
  angkatan: string;
}

/**
 * Lightweight in-memory student session stored in sessionStorage.
 * Replace with real auth when a backend is connected.
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

  const login = (student: StudentSession) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(student));
    setSession(student);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  const isLoggedIn = session !== null;

  return { session, isLoggedIn, login, logout };
};
