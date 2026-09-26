import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove auth sessions left over from the retired backend project — they cause
// endless failing token-refresh requests in the browser.
try {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token") && !k.includes("kriafnaoqxbbdxknnbgf"))
    .forEach((k) => localStorage.removeItem(k));
} catch {
  /* storage unavailable */
}

createRoot(document.getElementById("root")!).render(<App />);

