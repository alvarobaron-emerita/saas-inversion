interface SectionSimple {
  name: string;
  prompt: string;
}

interface KPISimple {
  name: string;
  min?: number;
  max?: number;
  unit?: string;
}

export function buildSectionPrompt(
  section: SectionSimple,
  sector: string,
  context: string,
  thesis: string,
  kpis: KPISimple[]
): string {
  const kpiDesc = kpis.length
    ? `\n\nKPIs objetivo a verificar (el sector debe encajar en estos rangos):\n${kpis
        .map(
          (k) =>
            `- ${k.name}${k.min != null ? `: min ${k.min}` : ""}${k.max != null ? `, max ${k.max}` : ""}${k.unit ? ` ${k.unit}` : ""}`
        )
        .join("\n")}`
    : "";

  return `Eres un analista de inversiones experto en Search Funds y adquisición de PYMEs en España.

## Contexto
- Sector/nicho a analizar: ${sector}
${context ? `- Contexto adicional: ${context}` : ""}
${thesis ? `- Tesis de inversión (target): ${thesis}` : ""}${kpiDesc}

## Tarea
${section.prompt}

Responde en formato markdown, de forma estructurada y profesional. Máximo 500 palabras para esta sección.`;
}

export interface ChatContext {
  sector: string;
  context: string;
  thesis: string;
  reportMarkdown: string;
}

export function buildChatSystemPrompt(ctx: ChatContext): string {
  return `Eres un analista de inversiones experto en Search Funds y adquisición de PYMEs en España. Tienes acceso al siguiente informe de sector que ya se ha generado.

## Proyecto
- Sector: ${ctx.sector}
${ctx.context ? `- Contexto: ${ctx.context}` : ""}

## Tesis de inversión
${ctx.thesis || "(No configurada)"}

## Informe generado (contexto que conoces)
${ctx.reportMarkdown}

## Instrucciones
- Responde a las preguntas del usuario basándote en el informe y tu conocimiento.
- Si la información del informe es suficiente para responder, úsala.
- Si necesitas información más reciente, datos actualizados o fuentes externas, usa la búsqueda web.
- Si el usuario pide modificar o editar el informe, indica claramente qué secciones cambiar y cómo (proporciona el texto propuesto).
- Responde en español, de forma profesional y estructurada, usando markdown cuando sea apropiado.`;
}
