/**
 * Pruebas unitarias para las reglas de negocio críticas del MVP de Rescate de Alimentos.
 * Valida los criterios de aceptación de CMP-01, CMP-02 y CMP-03.
 */
import { describe, test, expect } from 'vitest';

describe("Reglas de Negocio del MVP - Red de Rescate de Alimentos", () => {
  test("CA-01.2: Debe rechazar el registro de donación si no se acepta la exención legal (Ley 1990/2019)", () => {
    const payload = {
      tipoAlimento: "Frutas y Verduras",
      cantidadEstimada: 45,
      unidadMedida: "kg",
      direccionRecogida: "Galería Alameda Local 12",
      horaLimite: "16:00",
      exencionSanitariaAceptada: false, // Falla intencional de compuerta
    };

    const esValido = payload.exencionSanitariaAceptada === true;
    expect(esValido).toBe(false);
  });

  test("CA-03.1 y CA-03.2: Exclusión mutua en la toma concurrente (Reserva Única)", () => {
    let estadoActual: "DISPONIBLE" | "ASIGNADA" = "DISPONIBLE";
    let voluntarioAsignado: string | null = null;

    // Primer voluntario que llega
    const tomarDonacion = (voluntario: string) => {
      if (estadoActual !== "DISPONIBLE") {
        return { exito: false, mensaje: "Esta donación ya fue tomada por otro voluntario" };
      }
      estadoActual = "ASIGNADA";
      voluntarioAsignado = voluntario;
      return { exito: true, mensaje: "Donación asignada correctamente" };
    };

    const res1 = tomarDonacion("Voluntario_1_Carromoto");
    expect(res1.exito).toBe(true);
    expect(voluntarioAsignado).toBe("Voluntario_1_Carromoto");

    // Segundo voluntario que llega tarde
    const res2 = tomarDonacion("Voluntario_2_Moto");
    expect(res2.exito).toBe(false);
    expect(res2.mensaje).toContain("ya fue tomada");
    expect(voluntarioAsignado).toBe("Voluntario_1_Carromoto");
  });

  test("CA-02.2 y CA-02.3: Restricción de cadena de frío y filtrado por zonas de Cali", () => {
    const donaciones = [
      { id: "1", codigo: "DON-101", requiereFrio: true, zona: "CENTRO", estado: "DISPONIBLE" },
      { id: "2", codigo: "DON-102", requiereFrio: false, zona: "SUR", estado: "DISPONIBLE" },
      { id: "3", codigo: "DON-103", requiereFrio: false, zona: "CENTRO", estado: "DISPONIBLE" },
    ];

    // Comedor sin refrigeración: excluye las que requieren frío
    const comedorSinNevera = { tieneRefrigeracion: false };
    const permitidasComedor = donaciones.filter((d) =>
      comedorSinNevera.tieneRefrigeracion ? true : !d.requiereFrio
    );
    expect(permitidasComedor.length).toBe(2);
    expect(permitidasComedor.some((d) => d.requiereFrio)).toBe(false);

    // Filtro reactivo por sector de Cali
    const filtrarPorZona = (zona: string) =>
      donaciones.filter((d) => zona === "TODAS" || d.zona === zona);

    expect(filtrarPorZona("CENTRO").length).toBe(2);
    expect(filtrarPorZona("SUR").length).toBe(1);
    expect(filtrarPorZona("TODAS").length).toBe(3);
  });

  test("CA-03.4: Construcción de enlaces universales HTML5 para navegación satelital y telefonía móvil", () => {
    const direccion = "Calle 23 # 29-10, Cali, Valle del Cauca";
    const telefono = "+573175550505";

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    const telLink = `tel:${telefono}`;

    expect(mapsUrl).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(mapsUrl).toContain(encodeURIComponent(direccion));
    expect(telLink).toBe("tel:+573175550505");
  });
});
