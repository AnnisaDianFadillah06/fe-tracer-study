import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="tracer-study-theme">
    <App />
  </ThemeProvider>
);
