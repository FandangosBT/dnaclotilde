# Interface de Chat GPT para Equipe Comercial — Plano de Desenvolvimento

## Visão Geral

Ferramenta web de chat para SDRs e Closers interagirem com um agente GPT, recebendo respostas, insights e estratégias de vendas em tempo real. Sem autenticação e sem persistência de dados; apenas sessão em memória no cliente.

## 1. Configuração do Projeto

### 1.1 Configuração do repositório

- [x] Inicializar repositório e convenções
  - ✅ Monorepo (frontend/ e backend/), .gitignore, .nvmrc configurado
- [x] Lint/format
  - ✅ ESLint + Prettier (FE/BE) e Husky + lint-staged para pre-commit
- [x] CI básico
  - ✅ Pipeline: lint, testes e build em PRs (.github/workflows/ci.yml)

### 1.2 Configuração do ambiente de desenvolvimento

- [x] Versões e pacotes
  - ✅ Node LTS (.nvmrc), npm workspaces, scripts para dev FE/BE em paralelo
- [x] Variáveis de ambiente
  - ✅ .env.example criado; chaves do provedor LLM documentadas
- [x] CORS e portas
  - ✅ CORS configurado (\*), portas padrão (3001 BE, 5174 FE)

### 1.3 Configuração do banco de dados

- [x] V1 sem banco
  - ✅ Decisão documentada "sem DB na v1"; logs estruturados com pino

### 1.4 Estrutura inicial do projeto

- [x] Pastas e bases
  - ✅ frontend/ (Vite + React + TS); backend/ (Node + Express com SSE)
- [x] Dependências base
  - ✅ FE: React, Tailwind v4, Zustand | BE: Express, zod, pino

## 2. Base do Backend

### 2.1 Migrações e modelos do banco de dados

- [x] Placeholder
  - ✅ Decisão "sem DB na v1" registrada; estrutura preparada

### 2.2 Sistema de autenticação

- [x] Sem autenticação na v1
  - ✅ Sem proteção por API key; CORS aberto para desenvolvimento

### 2.3 Serviços e utilitários principais

- [x] Cliente LLM
  - ✅ Serviço streaming com openaiClient.js; cancelamento via AbortController
  - ✅ Compatibilidade de parâmetros por modelo (max_tokens vs max_completion_tokens; omissão de temperature para gpt-5)
  - ✅ Fallback automático para gpt-4o-mini quando streaming estiver restrito no modelo preferido
  - ✅ Parser SSE robusto para Web Streams (getReader) e Node Readable (for await...of)
  - ✅ Parametrização de modelos preferido e fallback via variáveis de ambiente (OPENAI_MODEL_PREFERRED/OPENAI_MODEL_FALLBACK)
- [x] Builder de prompt
  - ✅ Modo (SDR/Closer), tom (breve/detalhado), formalidade (informal/formal)
- [x] Observabilidade
  - ✅ Logger pino com request-id; logs estruturados implementados
  - ✅ Redução de verbosidade no caminho feliz; logs de retry/fallback apenas em debug
- [x] Segurança e limites
  - ✅ Rate limiting in-memory por IP; validação de entrada (zod parcial)

### 2.4 Estrutura base da API

- [x] Endpoints iniciais
  - ✅ POST /chat/stream (SSE) ✅ GET /health ✅ GET /templates ✅ POST /feedback ✅ GET /diagnostics/llm
- [x] Erros e timeouts
  - Mapeamento consistente de erros, timeouts e retries com backoff

## 3. Backend Específico de Funcionalidades

### 3.1 Chat básico com streaming (US-003/004)

- [x] SSE de resposta token-a-token com heartbeats
- [x] Cancelamento (AbortController)

### 3.2 Seleção de contexto/processo (US-002)

- [x] Prompt builder: modos SDR/Closer e parâmetros de tom/formalidade
- [x] Objetivos (qualificar, objeções, follow-up, descoberta, fechamento)

### 3.3 Templates e sugestões (US-005/006)

- [x] GET /templates: catálogo estático por modo/objetivo
- [x] Sugestões de follow-up no response

### 3.4 Controles de tom e formato (US-007)

- [x] Parâmetros breve/detalhado e formal/informal no prompt

### 3.5 Feedback 👍👎 (US-012)

- [x] POST /feedback: registrar avaliação e motivo (sem PII)

### 3.6 Tratamento de erros e limites (US-011)

- [x] Normalizar mensagens de erro, códigos HTTP e payload amigável

## 4. Base do Frontend

### 4.1 Configuração do framework de UI

- [x] Vite + React + TS, Tailwind v4

### 4.2 Biblioteca de componentes

- [x] Componentes principais
  - ✅ ChatMessage, ChatInput, Header, TemplatesDrawer, ContextSwitcher (objective), ErrorBanner, LoadingIndicator, CopyButton, ExportButton
- [x] Componentes adicionais
  - SuggestionsChips, FeedbackButtons, ConfirmDialog, KeyboardShortcutsModal, PrivacyNotice

### 4.3 Sistema de rotas

- [x] Rota única "/": página de chat

### 4.4 Gerenciamento de estado

- [x] Zustand com slices otimizadas
  - ✅ Store dividida em slices (messages, config, ui), hooks helpers (useMessages, useConfig, useUI), seletores específicos para evitar re-renders

### 4.5 UI de autenticação

- [x] Não aplicável na v1 (texto informativo no header)

## 5. Frontend Específico de Funcionalidades

### 5.1 Enviar/receber com streaming (US-003)

- [x] Parser de SSE e renderização incremental
- [x] Botão “Parar” e atalho Esc para cancelar

### 5.2 Regenerate/cancelar (US-004)

- [x] Reexecutar última mensagem

### 5.3 Seleção de contexto e objetivo (US-002)

- [x] ContextSwitcher (objetivo) e presets rápidos; refletir no próximo envio

### 5.4 Templates (US-005)

- [x] Drawer com catálogo; inserir no input como texto editável
- [x] Acessibilidade e teclado: navegação por setas, Enter, Escape, ARIA labels

### 5.5 Sugestões de próximo passo (US-006)

- [x] Chips clicáveis anexados à última resposta; envia nova mensagem

### 5.6 Controles de tom/formato (US-007)

- [x] Alternadores de tom/formalidade na UI (sessão atual)

### 5.7 Copiar e exportar (US-008/009)

- [x] Copiar por mensagem com toast “Copiado!”
- [x] Exportar sessão .txt com timestamp e configs (modo/tom/formalidade)

### 5.8 Limpar conversa (US-010)

- [x] Botão “Limpar” com confirmação leve; reset do estado

### 5.9 Erros e avisos (US-011/014/013)

- [x] Banner de erro e aviso de privacidade básico
- [x] Atalhos (Enter, Shift+Enter, /, ?, Esc)

## 6. Integração

- [x] Conectar FE→BE
  - ✅ SSE para /chat/stream e GET /health
- [x] Estados ponta a ponta
  - ✅ Spinner (loading/streaming), interrupção (cancel), retomada (regenerate), limites básicos (validações cliente)

## 7. Testes

### 7.1 Testes unitários

- [x] BE: prompt builder, validações, mapeamento de erros
- [x] FE: stores (messagesSlice), Header e parser de SSE

### 7.2 Testes de integração

- [x] BE: /health e /templates
- [x] BE: /chat/stream com LLM mockado
- [x] BE: /feedback

### 7.3 Testes ponta a ponta

- [ ] Fluxos principais: enviar, parar, regenerate, templates, sugestões, exportar, limpar

### 7.4 Testes de desempenho

- [ ] p95 de primeira resposta; Lighthouse FE; carga leve BE

### 7.5 Testes de segurança

- [ ] CORS, rate limiting, validação de inputs, varredura de dependências

## 8. Documentação

- [ ] Documentação da API (OpenAPI/README)
- [ ] Guias para usuários (onboarding, atalhos, limites e boas práticas)
- [ ] Documentação para devs (setup, scripts, variáveis e decisões)
- [ ] Arquitetura (diagrama FE↔BE↔LLM, fluxos SSE e erros)

## 9. Implantação

- [ ] CI/CD (build/test em PR; deploy automático)
- [ ] Staging (Vercel/Netlify FE + Railway/Render/Fly.io BE)
- [ ] Produção (domínio, TLS, escalonamento; rotação de chaves LLM)
- [ ] Monitoramento (health checks, logs estruturados, métricas)

## 10. Manutenção

- [ ] Correção de bugs (triage, SLAs, rollback)
- [ ] Processos de atualização (Dependabot, modelos LLM, libs)
- [ ] Backups (configs e infraestrutura CI/CD)
- [ ] Monitoramento de desempenho (latência/erros; revisão de custos)

Progresso estimado: 93%
