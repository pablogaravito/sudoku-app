import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Clean up the OAuth redirect hash immediately on page load, before React renders anything
if (window.location.hash) {
  window.history.replaceState(null, "", window.location.pathname);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
