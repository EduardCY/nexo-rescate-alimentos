import { describe, test, expect, vi, beforeEach } from 'vitest';
import { DonacionInputSchema } from '@/lib/validations/donacion';
import { publicarDonacion } from '@/actions/donaciones';
import * as supabaseServer from '@/lib/supabase/server';

describe('CMP-01 · Validación de Negocio y Publicación de Donaciones (RF-001, RF-017)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const fechaFutura = new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(); // 3 horas en el futuro
  const fechaPasada = new Date(Date.now() - 1000 * 60 * 30).toISOString(); // 30 mins en el pasado

  describe('Criterio CA-01.1: Publicación exitosa con datos completos y exención legal', () => {
    test('Debe validar exitosamente un payload con todos los campos requeridos', () => {
      const payload = {
        tipoAlimento: 'Panadería y Lácteos',
        cantidadEstimada: 15.5,
        unidadMedida: 'kg' as const,
        direccionRecogida: 'Calle 10 # 15-20, Cali',
        horaLimite: fechaFutura,
        requiereFrio: false,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.tipoAlimento).toBe('Panadería y Lácteos');
        expect(resultado.data.cantidadEstimada).toBe(15.5);
        expect(resultado.data.unidadMedida).toBe('kg');
        expect(resultado.data.exencionSanitariaAceptada).toBe(true);
      }
    });

    test('Debe asignar requiereFrio como false por defecto si se omite', () => {
      const payload = {
        tipoAlimento: 'Frutas Variadas',
        cantidadEstimada: 50,
        unidadMedida: 'canastillas' as const,
        direccionRecogida: 'Plaza Santa Elena Puesto 45',
        horaLimite: fechaFutura,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.requiereFrio).toBe(false);
      }
    });
  });

  describe('Criterio CA-01.2: Validación de ventana temporal futura', () => {
    test('Debe rechazar la publicación si la hora límite es anterior a la actual', () => {
      const payload = {
        tipoAlimento: 'Verduras frescas',
        cantidadEstimada: 20,
        unidadMedida: 'kg' as const,
        direccionRecogida: 'Galería Alameda Local 12',
        horaLimite: fechaPasada,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const issues = resultado.error.issues || (resultado.error as any).errors || [];
        const errorHora = issues.find((e: any) => e.path.includes('horaLimite'));
        expect(errorHora).toBeDefined();
        expect(errorHora?.message).toContain('futura');
      }
    });

    test('Debe rechazar la publicación si la hora límite no es una fecha válida', () => {
      const payload = {
        tipoAlimento: 'Verduras frescas',
        cantidadEstimada: 20,
        unidadMedida: 'kg' as const,
        direccionRecogida: 'Galería Alameda Local 12',
        horaLimite: 'fecha-invalida',
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });
  });

  describe('Criterio CA-01.3: Compuerta legal obligatoria (Ley 1990 de 2019)', () => {
    test('Debe rechazar la donación si exencionSanitariaAceptada es false', () => {
      const payload = {
        tipoAlimento: 'Arroz y Granos',
        cantidadEstimada: 10,
        unidadMedida: 'bultos' as const,
        direccionRecogida: 'Supermercado Central',
        horaLimite: fechaFutura,
        exencionSanitariaAceptada: false,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const issues = resultado.error.issues || (resultado.error as any).errors || [];
        const errorLegal = issues.find((e: any) => e.path.includes('exencionSanitariaAceptada'));
        expect(errorLegal).toBeDefined();
        expect(errorLegal?.message).toContain('Ley 1990');
      }
    });

    test('Debe rechazar la donación si exencionSanitariaAceptada es omitida (undefined)', () => {
      const payload = {
        tipoAlimento: 'Arroz y Granos',
        cantidadEstimada: 10,
        unidadMedida: 'bultos' as const,
        direccionRecogida: 'Supermercado Central',
        horaLimite: fechaFutura,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });
  });

  describe('Criterio CA-01.4: Control de Alimentos Perecederos (requiereFrio)', () => {
    test('Debe registrar requiereFrio como true cuando el alimento es perecedero', () => {
      const payload = {
        tipoAlimento: 'Carne de res congelada',
        cantidadEstimada: 30,
        unidadMedida: 'kg' as const,
        direccionRecogida: 'Fama San Juan Calle 5',
        horaLimite: fechaFutura,
        requiereFrio: true,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.requiereFrio).toBe(true);
      }
    });
  });

  describe('Validaciones de Integridad y Dominio Adicionales', () => {
    test('Debe rechazar tipoAlimento con menos de 3 caracteres', () => {
      const payload = {
        tipoAlimento: 'Ab',
        cantidadEstimada: 10,
        unidadMedida: 'kg' as const,
        direccionRecogida: 'Calle 10 # 15-20',
        horaLimite: fechaFutura,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });

    test('Debe rechazar cantidadEstimada menor o igual a cero', () => {
      const payload = {
        tipoAlimento: 'Frutas',
        cantidadEstimada: 0,
        unidadMedida: 'kg' as const,
        direccionRecogida: 'Calle 10 # 15-20',
        horaLimite: fechaFutura,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });

    test('Debe rechazar una unidadMedida no permitida', () => {
      const payload = {
        tipoAlimento: 'Sopa lista',
        cantidadEstimada: 10,
        unidadMedida: 'litros',
        direccionRecogida: 'Calle 10 # 15-20',
        horaLimite: fechaFutura,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });

    test('Debe rechazar direccionRecogida con menos de 5 caracteres', () => {
      const payload = {
        tipoAlimento: 'Pan',
        cantidadEstimada: 5,
        unidadMedida: 'unidades' as const,
        direccionRecogida: 'Cali',
        horaLimite: fechaFutura,
        exencionSanitariaAceptada: true as const,
      };

      const resultado = DonacionInputSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });
  });

  describe('Server Action: publicarDonacion', () => {
    test('Debe rechazar el llamado y no tocar la base de datos si el payload es inválido', async () => {
      const mockInsert = vi.fn();
      vi.spyOn(supabaseServer, 'createClient').mockReturnValue({
        from: () => ({ insert: mockInsert }),
      } as any);

      const res = await publicarDonacion({
        tipoAlimento: 'No',
        cantidadEstimada: -5,
        unidadMedida: 'kg',
        direccionRecogida: 'Cali',
        horaLimite: fechaPasada,
        requiereFrio: false,
        exencionSanitariaAceptada: false as any,
      });

      expect(res.exito).toBe(false);
      if (!res.exito) {
        expect(res.error).toBeDefined();
      }
      expect(mockInsert).not.toHaveBeenCalled();
    });

    test('Debe insertar en Supabase mapeando campos snake_case y retornar código generado', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: { codigo: 'DON-105' },
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

      vi.spyOn(supabaseServer, 'createClient').mockReturnValue({
        from: fromMock,
      } as any);

      const res = await publicarDonacion({
        tipoAlimento: 'Plátano Maduro',
        cantidadEstimada: 40,
        unidadMedida: 'kg',
        direccionRecogida: 'Bodega Cavasa Módulo 3',
        horaLimite: fechaFutura,
        requiereFrio: false,
        exencionSanitariaAceptada: true,
      });

      expect(res.exito).toBe(true);
      if (res.exito) {
        expect(res.codigo).toBe('DON-105');
      }

      expect(fromMock).toHaveBeenCalledWith('donaciones');
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          tipo_alimento: 'Plátano Maduro',
          cantidad_estimada: 40,
          unidad_medida: 'kg',
          direccion_recogida: 'Bodega Cavasa Módulo 3',
          requiere_frio: false,
          exencion_sanitaria_aceptada: true,
          estado: 'DISPONIBLE',
        }),
      ]);
    });

    test('Debe retornar error amigable si Supabase falla en el insert', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Conexión rechazada por base de datos' },
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

      vi.spyOn(supabaseServer, 'createClient').mockReturnValue({
        from: fromMock,
      } as any);

      const res = await publicarDonacion({
        tipoAlimento: 'Tomate Chonto',
        cantidadEstimada: 80,
        unidadMedida: 'canastillas',
        direccionRecogida: 'Galería Santa Elena Puesto 10',
        horaLimite: fechaFutura,
        requiereFrio: false,
        exencionSanitariaAceptada: true,
      });

      expect(res.exito).toBe(false);
      if (!res.exito) {
        expect(res.error).toContain('Conexión rechazada');
      }
    });
  });
});
