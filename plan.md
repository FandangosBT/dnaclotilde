# DNA Clotilde — Plano de Desenvolvimento

## Visão Geral

Plataforma de análise single-turn que sempre: (1) lê e usa o transcript enviado na requisição, (2) consulta a Base de Conhecimento (KB) global anexada ao Assistant da OpenAI (2 PDFs), e (3) opcionalmente consulta a Web. Responde em pt-BR, com análise profunda, estruturada e com citações (Transcript, KB e Web). Deploy em Vercel (serverless functions em api/).

## 1. Configuração do Projeto

- [x] Configuração do ambiente de desenvolvimento
  - [x] Scripts npm para desenvolvimento e testes
  - [x] Rate limit básico para endpoints sensíveis (throttle)
- [x] Configuração do repositório
  - [x] Definir regras de branch e convenções de commit
  - [x] Ajustar Husky (prepare resiliente já aplicado) e linters (ESLint/Prettier)
  - [x] Habilitar GitHub Actions (CI) para lint, testes e build
- [x] Estrutura inicial do projeto
  - [x] Confirmar monorepo (frontend, api, backend utilitário)
  - [x] Padrões de logs, erros e observabilidade (logs estruturados com reqId nas funções serverless)
  - [x] Headers de segurança (CSP/CORS) em vercel.json

## 2. Base do Backend

- [x] Serviços e utilitários principais
  - [x] Cliente OpenAI (Chat/Completions já usado em api/chat/stream.js)
  - [x] Serviço de Web Search (Tavily) com timeout e fallback (integrado no /api/analyze)
  - [x] Utilitários de chunking e citação (offsets/preview)
- [ ] Estrutura base da API
  - [x] Padrão de respostas (success/error + hints) via api/\_utils/response.js
  - [ ] Middlewares de validação e limites (tamanho do transcript)

## 3. Backend Específico de Funcionalidades

- [x] Endpoints da API para cada funcionalidade
  - POST /api/analyze (single-turn): query, transcript {type, data}, enableKB=true, enableWeb=false, options {language, depth, topK, temperature, maxTokens}
- [ ] Implementação da lógica de negócios
  - TranscriptHandler: normalizar, chunking (1.000–1.500 chars, overlap 150–200), decidir inline vs. upload para OpenAI Files
  - KB: usar Assistants API (thread efêmero + run com file_search)
  - Web: Tavily (Top-N=3–5, timeout, resumo dos snippets)
  - Orquestração: sempre consultar Transcript + KB; Web quando habilitada
- [x] Validação e processamento de dados
  - Validação de schema do body (query obrigatória; limites de tamanho)
  - Sanitização de URLs e texto
  - Defaults: pt-BR, depth=deep, temperature=0.4, maxTokens=1800, topK=6
- [ ] Integração com serviços externos
  - OpenAI: Assistants (usar OPENAI_ASSISTANT_ID) e gpt-4.1
  - Tavily: TAVILY_API_KEY (opcional, somente quando enableWeb=true)

## 4. Base do Frontend

- [ ] Configuração do framework de UI
  - [x] Vite + React já configurado; Tailwind presente
- [ ] Biblioteca de componentes
  - Componentes de Form/Inputs, Loader/Spinner, Alert/Toast, Code/Pre
- [ ] Sistema de rotas
  - Rota /analyze (página de teste interna)
- [ ] Gerenciamento de estado
  - [x] Estado local (React) para requisição e exibição de resposta/citações
- [ ] UI de autenticação
  - (Opcional) Campo de API Key para modo interno ou proteção simples

## 5. Frontend Específico de Funcionalidades

- [ ] Componentes de UI para cada funcionalidade
  - Formulário: query, textarea transcript (ou URL), toggle enableWeb, opções avançadas
  - Viewer de resposta: seções (Resumo, Análise, Evidências, Riscos/Lacunas, Próximos passos)
- [ ] Layouts de páginas e navegação
  - Página de Análise e link no menu principal (interno)
- [ ] Interações do usuário e formulários
  - Submissão para /api/analyze; loading; cancel/timeout
- [ ] Tratamento de erros e feedback
  - Exibir hints e detalhes quando houver fallbacks (ex.: sem Web)

## 6. Integração

- [ ] Integração com API
  - Conectar frontend à rota /api/analyze com JSON
  - Mapear e exibir citações (Transcript/Kb/Web)
- [ ] Conexões de funcionalidades ponta a ponta
  - Fluxo completo: preencher formulário → resposta estruturada com citações

## 7. Testes

- [x] Testes unitários
  - Utilitários: chunking, normalização, composição de prompt
- [x] Testes de integração
  - /api/chat/stream e utilitários com mocks
- [x] Testes ponta a ponta
  - Cenário real (frontend/e2e): a11y, streaming, templates, responsive, XSS
- [ ] Testes de desempenho
  - Latência por etapa; garantir resposta < 60s no serverless
- [ ] Testes de segurança
  - [x] XSS e validações no frontend/e2e
  - [ ] Verificar ausência de segredos no cliente; validação de inputs e limites

## 8. Documentação

- [ ] Documentação da API
  - Especificação do contrato /api/analyze e exemplos
- [ ] Guias para usuários
  - Como usar a página de análise; boas práticas de perguntas e transcripts
- [ ] Documentação para desenvolvedores
  - Setup local, variáveis de ambiente, execução de testes
- [ ] Documentação da arquitetura do sistema
  - Diagrama de fluxo (Transcript + KB + Web), decisões e trade-offs

## 9. Implantação

- [x] Configuração de pipeline CI/CD
  - CI rodando lint/test/build; gate de qualidade
- [x] Ambiente de staging
  - Projeto Vercel (preview deployments) para validação da feature
- [ ] Ambiente de produção
  - Deploy em produção após checklist de testes e QA
- [ ] Configuração de monitoramento
  - Logs de requests; métricas de latência e tokens (quando disponíveis)
- [x] Configuração de funções na Vercel
  - [x] maxDuration=60 para /api/chat/stream e /api/transcriptions/upload
  - [x] Adicionar /api/analyze com maxDuration=60

## 10. Manutenção

- [ ] Procedimentos para correção de bugs
  - Template de issues; rotas de rollback
- [ ] Processos de atualização
  - Versionamento semântico; changelog
- [ ] Estratégias de backup
  - (Fase futura) Se adotar DB para KB, definir backups/retention
- [ ] Monitoramento de desempenho
  - Revisões periódicas de latência e custo; otimizações de Top-K e timeouts

## Observações e Configuração de Ambientes

- Variáveis (Vercel): OPENAI_API_KEY, OPENAI_ASSISTANT_ID (asst_MlVmE6Yq9xtZjXwPjqlxjCiX), TAVILY_API_KEY (opcional)
- vercel.json: já possui maxDuration=60 para /api/chat/stream, /api/transcriptions/upload e /api/analyze; default 30s para demais functions
- Segurança: rotacionar imediatamente a chave AssemblyAI que está em backend/.env e manter apenas no Vercel
- Futuro: caso a KB cresça, migrar para RAG com vetor (Supabase + pgvector) mantendo paridade de citações
