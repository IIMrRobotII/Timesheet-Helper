import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@/lib/i18n/use-i18n";
import App from "./App";
import "./style.css";

document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>
  );
}
