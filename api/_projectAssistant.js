// Asistente de carga de proyectos: arma la configuración de un proyecto de interventoría
// a partir de lo que el usuario comparte (texto, hojas de Excel ya convertidas a texto, PDF).
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const Frente = z.object({
  civ: z.string().describe('Código de identificación vial (CIV) o código del tramo; vacío si no existe'),
  eje: z.string().describe('Vía o eje principal, ej. "KR 7F" o "Calle 148"'),
  desde: z.string(),
  hasta: z.string(),
  barrio: z.string(),
  tipoIntervencion: z.string().describe('Ej. "Andén", "Parcheo", "Reconstrucción"; vacío si no se indica'),
  lat: z.string().describe('Latitud decimal como texto, vacío si no se conoce'),
  lng: z.string().describe('Longitud decimal como texto, vacío si no se conoce'),
  area: z.number().describe('Área en m²; 0 si no se conoce'),
  progress: z.number().describe('Avance físico ejecutado en %, 0 si no se conoce'),
  plannedProgress: z.number().describe('Avance programado en %, 0 si no se conoce'),
  status: z.enum(['al-dia', 'alerta', 'critico']),
  supervisor: z.string(),
  totalBudget: z.number().describe('Presupuesto del frente en pesos; 0 si no se conoce'),
  description: z.string()
});

const Contrato = z.object({
  id: z.string().describe('Identificador interno corto: c1, c2, ...'),
  nombre: z.string().describe('Objeto o nombre completo del contrato de obra'),
  nombreCorto: z.string().describe('Nombre corto para la interfaz, ej. "Malla vial", "Espacio público", "Andenes"'),
  sigla: z.string().describe('Sigla de 2 letras para insignias, ej. "MV", "EP"'),
  numero: z.string().describe('Número del contrato de obra'),
  contratista: z.string(),
  prefijo: z.string().describe('Prefijo de los ids de frente: "f_mv" si es malla vial, "f_ep" si es espacio público, si no "f_c1", "f_c2"...'),
  numeroInicial: z.number().int().describe('Número del primer frente del contrato (1, 101, ...)'),
  presupuestoObra: z.number(),
  presupuestoInterventoria: z.number(),
  duracionMeses: z.number(),
  avanceProgramado: z.number(),
  descripcion: z.string(),
  frentes: z.array(Frente)
});

const AssistantResult = z.object({
  proyecto: z.object({
    id: z.string().describe('Identificador para la dirección: minúsculas, números y guiones, 3 a 40 caracteres'),
    nombre: z.string().describe('Nombre visible del proyecto, ej. "Frentes de obra en Usaquén"'),
    ubicacion: z.string(),
    contratante: z.string().describe('Entidad contratante, ej. "IDU"'),
    marca: z.object({
      nombre: z.string().describe('Nombre de la empresa interventora'),
      nombreCorto: z.string(),
      color: z.string().describe('Color de marca en hexadecimal #RRGGBB; si no se conoce usa #1f3a5f')
    }),
    interventoria: z.object({
      consorcio: z.string(),
      contrato: z.string().describe('Número del contrato de interventoría')
    }),
    calendario: z.object({
      numeroPrimeraSemana: z.number().int().describe('Número de la primera semana de seguimiento (normalmente 1)'),
      fechaInicioPrimeraSemana: z.string().describe('Fecha AAAA-MM-DD del primer día de la primera semana')
    }),
    contratos: z.array(Contrato)
  }),
  notas: z.array(z.string()).describe('Supuestos hechos y datos que faltan y el usuario debe revisar, en español, una idea por elemento')
});

const SYSTEM = `Eres el asistente de configuración de InterventorIA, una aplicación de seguimiento de frentes de obra para interventorías de infraestructura en Colombia.
El usuario te comparte documentos de un proyecto (actas, listados de frentes, contratos, hojas de cálculo). Tu trabajo es armar la configuración del proyecto con el esquema pedido.

Criterios:
- Usa solo datos presentes en los documentos. Si un dato no aparece, deja el texto vacío o 0 y anótalo en "notas". No inventes coordenadas, códigos CIV ni presupuestos.
- Cada fila de un listado de frentes o tramos es un frente. Conserva el orden del documento.
- Agrupa los frentes por contrato. Si solo hay un contrato, crea uno.
- Las coordenadas van en grados decimales (Bogotá ronda latitud 4.6 y longitud -74.1). Si vienen en otro formato, conviértelas y anótalo.
- Las semanas de seguimiento van de sábado a viernes salvo que el documento diga otra cosa; la fecha de inicio de la primera semana debe ser el primer día de esa semana.
- Escribe "notas" pensando en quien revisará el borrador: qué asumiste y qué falta, de forma concreta.`;

export function isAssistantConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/**
 * @param {{ texto?: string, archivos?: Array<{ nombre: string, tipo: 'texto'|'pdf', contenido: string }> }} input
 */
export async function draftProjectFromDocuments(input) {
  const content = [];
  for (const file of input.archivos || []) {
    if (file.tipo === 'pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.contenido },
        title: file.nombre
      });
    } else {
      content.push({ type: 'text', text: `Archivo "${file.nombre}":\n${file.contenido}` });
    }
  }
  content.push({
    type: 'text',
    text: `${input.texto?.trim() ? `Indicaciones del usuario:\n${input.texto.trim()}\n\n` : ''}Arma la configuración del proyecto con los documentos anteriores.`
  });

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: {
      effort: 'medium',
      format: zodOutputFormat(AssistantResult)
    }
  });

  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('El asistente no pudo procesar estos documentos.'), { status: 422 });
  }
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
    throw Object.assign(new Error('El borrador quedó incompleto (documentos muy extensos). Divide el listado de frentes en partes.'), { status: 422 });
  }

  const { proyecto, notas } = response.parsed_output;
  proyecto.marca = { logoUrl: '', ...proyecto.marca };
  return { proyecto, notas };
}
