import { z } from 'zod';

// Los nombres son propuestas de Panel pendientes de acuerdo con cada squad: por eso se leen del entorno
const topicsSchema = z.object({
  TOPIC_CATALOGO: z.string().min(1).default('panel.evento.catalogo.v1'),
  TOPIC_ENTRADAS: z.string().min(1).default('panel.evento.entradas.v1'),
  TOPIC_NOTIFICACIONES: z.string().min(1).default('panel.evento.notificaciones.v1'),
  TOPIC_CHECKIN: z.string().min(1).default('panel.evento.checkin.v1'),
  TOPIC_PROMOCIONES: z.string().min(1).default('panel.evento.promociones.v1'),
});

export type Topics = { catalogo: string; entradas: string; notificaciones: string; checkin: string; promociones: string };

export function loadTopics(env: NodeJS.ProcessEnv = process.env): Topics {
  const t = topicsSchema.parse(env);
  return {
    catalogo: t.TOPIC_CATALOGO, entradas: t.TOPIC_ENTRADAS, notificaciones: t.TOPIC_NOTIFICACIONES,
    checkin: t.TOPIC_CHECKIN, promociones: t.TOPIC_PROMOCIONES,
  };
}
