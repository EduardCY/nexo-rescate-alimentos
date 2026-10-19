import type { Metadata } from "next";
import { Inter, JetBrains_Mono, VT323 } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const vt = VT323({ subsets: ["latin"], weight: "400", variable: "--font-vt" });

export const metadata: Metadata = {
  title: "NEXO: Rescate de Alimentos v2.0 | Logística y Certificación de Impacto",
  description:
    "Plataforma de logística en tiempo real para redistribuir excedentes de alimentos a ONGs y certificar impacto ambiental y tributario.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${sans.variable} ${mono.variable} ${vt.variable} antialiased selection:bg-[#000080] selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
