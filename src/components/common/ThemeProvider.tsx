import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "tracer-study-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    const applySystemTheme = () => {
      root.classList.remove("light", "dark");
      root.classList.add(
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      );
    };

    if (theme === "system") {
      applySystemTheme();

      // Ikuti perubahan preferensi OS secara langsung (mis. jadwal dark
      // mode otomatis Windows/macOS) selama tema masih "system" -- tanpa
      // ini pengguna harus reload halaman untuk melihat perubahannya.
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", applySystemTheme);
      return () => media.removeEventListener("change", applySystemTheme);
    }

    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
