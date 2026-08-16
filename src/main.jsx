import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";
import { initInstallPrompt } from "./pwa/installPrompt";

// Capturar el evento de instalación PWA desde el arranque (se dispara
// segundos después de cargar, antes de que el usuario abra Ajustes).
initInstallPrompt();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
