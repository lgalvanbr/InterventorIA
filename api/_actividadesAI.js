// Resumen con IA de las actividades técnicas de la semana, frente por frente, para el informe.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const Result = z.object({
  frentes: z.array(z.object({
    id: z.string().describe('El id del frente tal como llegó'),
    texto: z.string().describe('Área técnica del frente: 1 a 3 líneas que empiezan con "-" y terminan en punto')
  }))
});

const SYSTEM = `Eres ingeniero residente de una interventoría de obras viales en Bogotá y redactas la sección "ACTIVIDADES EN EJECUCION – AREA TECNICA" del informe semanal.
Recibes, por frente, las líneas de actividades técnicas que los inspectores registraron en la bitácora durante la semana (vienen de WhatsApp: con repeticiones, errores de digitación y comentarios sueltos).

Redacta para cada frente un consolidado muy conciso para el informe:
- De 1 a 3 líneas, cada una empieza con "-" y termina en punto. Normalmente una sola línea basta.
- Solo lo más relevante de la semana: actividades principales ejecutadas, su avance (abscisas o cantidades cuando aporten), hitos (inicio o finalización de actividades o del frente) y lo que queda pendiente.
- Incluye novedades técnicas importantes (daños a redes, intervenciones sin PMT aprobado, fisuras, esperas de material) en una frase corta.
- Omite clima, personal, maquinaria, SST, orden y aseo, acopios, descargues, saludos y comentarios personales.
- Tercera persona impersonal y pasado ("Se realizó…", "Se finalizó…", "Queda pendiente…"). Corrige ortografía. No inventes datos que no estén en las líneas.
- Si las líneas solo dicen que no hubo actividad, escribe "-Sin actividad durante la semana."

Ejemplos del estilo:
-Se finalizó el vaciado del tramo pendiente de 5 ml de andén en el costado derecho. Queda pendiente la subsanación técnica de fisuras superficiales y la ejecución de remates finales.
-Finalización de cintas de ajuste en los andenes y retiro de cerramiento de obra por finalización del frente.`;

/** @param {Array<{ id: string, frente: string, lineas: string[] }>} frentes */
export async function summarizeWeekActivities(frentes) {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: frentes.map(f => `FRENTE ${f.frente} (id ${f.id}):\n${f.lineas.map(l => `- ${l}`).join('\n')}`).join('\n\n')
    }],
    output_config: { effort: 'medium', format: zodOutputFormat(Result) }
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw Object.assign(new Error('No se pudo generar el resumen. Intenta de nuevo.'), { status: 422 });
  }
  return response.parsed_output.frentes;
}
