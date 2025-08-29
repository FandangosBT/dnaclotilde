import 'dotenv/config'
export const config = {
  port: process.env.PORT || 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    // Compatibilidade: OPENAI_MODEL ainda é suportado, mas preferimos as novas variáveis
    modelPreferred: process.env.OPENAI_MODEL_PREFERRED || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    modelFallback:
      process.env.OPENAI_MODEL_FALLBACK || process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
    // model é mantido para lugares antigos; internamente usaremos modelPreferred
    model: process.env.OPENAI_MODEL || process.env.OPENAI_MODEL_PREFERRED || 'gpt-4o-mini',
    fallbackModel:
      process.env.OPENAI_FALLBACK_MODEL || process.env.OPENAI_MODEL_FALLBACK || 'gpt-4o-mini',
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS ?? 800),
    // Novo: Assistants API
    assistantId: process.env.OPENAI_ASSISTANT_ID || '',
  },
  // Novo: seletor de provider
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai_chat', // 'openai_chat' | 'openai_assistants'
  },
  // AssemblyAI
  assembly: {
    apiKey: process.env.ASSEMBLYAI_API_KEY || '',
    baseUrl: process.env.ASSEMBLYAI_BASE_URL || 'https://api.assemblyai.com/v2',
  },
}
