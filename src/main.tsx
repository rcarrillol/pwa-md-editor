import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./md-editor";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
