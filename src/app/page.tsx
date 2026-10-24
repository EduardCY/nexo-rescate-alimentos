import React from "react";
import NexoApp from "@/components/nexo/NexoApp";

export const metadata = {
  title: "NEXO: Red de Rescate de Alimentos | Fundación Mesa Común",
  description: "Plataforma de rescate y redistribución de alimentos para comerciantes de plazas de mercado y comedores comunitarios de Cali.",
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <NexoApp initialView="dashboard" />
    </main>
  );
}
