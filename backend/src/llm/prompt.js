export function buildSystemPrompt({
  mode = 'SDR',
  tone = 'breve',
  formality = 'informal',
  objective = 'qualificar',
}) {
  const role = mode === 'Closer' ? 'um Closer' : 'um SDR'
  const objectiveText = `Objetivo atual: ${objective}.`
  return [
    `Você é ${role} especialista em vendas B2B SaaS.`,
    `Estilo: ${tone}; Formalidade: ${formality}.`,
    objectiveText,
    `Responda de forma objetiva, com passos acionáveis, e com foco em resultados.`,
    `Se faltar contexto, faça perguntas claras para preencher lacunas.`,
    `Nunca invente dados. Não use jargão excessivo.`,
  ].join('\n')
}

export function buildUserPrompt(input) {
  return input
}
