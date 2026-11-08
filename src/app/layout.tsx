import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, VT323 } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { SessionProvider } from "@/lib/auth/session-context";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const vt = VT323({ subsets: ["latin"], weight: "400", variable: "--font-vt" });

export const metadata: Metadata = {
  title: "NEXO: Rescate de Alimentos v2.0 | Logística y Certificación de Impacto",
  description:
    "Plataforma de logística en tiempo real para redistribuir excedentes de alimentos a comedores comunitarios en Cali y certificar impacto ambiental y tributario.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nexo Rescate",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body
        className={`${sans.variable} ${mono.variable} ${vt.variable} antialiased selection:bg-[#000080] selection:text-white`}
      >
        <SessionProvider>
          <ServiceWorkerRegister />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
