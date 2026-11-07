"use client";

import { useEffect } from "react";

/**
 * Componente cliente para registrar el Service Worker de la PWA en el navegador.
 * Requisito indispensable para habilitar el banner de instalación en móviles (Android/iOS).
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Registro exitoso del Service Worker
            if (process.env.NODE_ENV === "development") {
              // En desarrollo solo verificamos que no arroje errores
            }
          })
          .catch((error) => {
            console.error("Error al registrar el Service Worker PWA:", error);
          });
      });
    }
  }, []);

  return null;
}
