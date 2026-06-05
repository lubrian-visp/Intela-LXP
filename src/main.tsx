import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Unregister any stale service workers that may have cached old JS modules.
// Stale JS module caching causes React dispatcher to be null → "Cannot read
// properties of null (reading 'useContext')" at app boot.
// In production, vite-plugin-pwa registers a versioned workbox SW automatically.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => {
      // Unregister the old custom /sw.js — it uses stale-while-revalidate which
      // is unsafe for JS modules. VitePWA workbox SW handles offline in production.
      if (reg.active?.scriptURL?.endsWith("/sw.js")) {
        reg.unregister();
      }
    });
  });
}
