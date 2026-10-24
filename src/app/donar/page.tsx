import React from "react";
import NexoApp from "@/components/nexo/NexoApp";

export const metadata = {
  title: "Alta de Donación | NEXO Rescate de Alimentos",
  description: "Publicación rápida de excedentes de alimentos bajo la Ley 1990 de 2019 para comedores de Cali.",
};

export default function DonarPage() {
  return (
    <main className="min-h-screen">
      <NexoApp initialView="donation" />
    </main>
  );
}
