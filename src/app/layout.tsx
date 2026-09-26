import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rescate de Alimentos | Fundación Mesa Común",
  description: "Plataforma de coordinación logística para el rescate y redistribución de excedentes de alimentos en Cali.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
