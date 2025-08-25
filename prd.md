# PRD: Interface de Chat GPT para Equipe Comercial

1. visão geral do produto

1.1 título do documento e versão

- PRD: Interface de Chat GPT para Equipe Comercial
- Versão: 0.1

  1.2 resumo do produto

Esta ferramenta é uma interface web de chat para que SDRs e Closers interajam com um agente GPT treinado em instruções e processos comerciais, recebendo respostas, insights e estratégias em tempo real durante suas atividades.

O foco é proporcionar um fluxo de conversa simples, rápido e eficiente, com recursos práticos para condução de prospecção e fechamento, sem autenticação de usuários, sem retenção de dados e sem memórias persistentes.

2. objetivos

2.1 objetivos de negócio

- aumentar a produtividade do time comercial (SDRs e Closers)
- reduzir tempo de preparação de ligações/reuniões
- padronizar discurso e boas práticas de abordagem
- acelerar ramp-up de novos vendedores

  2.2 objetivos do usuário

- obter respostas e sugestões acionáveis rapidamente
- adaptar o tom e o formato das respostas ao contexto
- usar atalhos e recursos de chat familiares
- exportar ou copiar conversas quando necessário

  2.3 não-objetivos

- autenticação de usuários
- retenção de dados, memórias ou histórico persistente
- integração com CRM/telefonia nesta fase
- relatórios avançados ou dashboards de BI

3. personas de usuário

3.1 principais tipos de usuário

- sdr
- closer
- gestor comercial
- ops/ti

  3.2 detalhes básicos das personas

- SDR: prospecta, agenda reuniões e qualifica leads.
- Closer: conduz reuniões, negocia e fecha oportunidades.
- Gestor Comercial: supervisiona a operação e qualidade do discurso.
- Ops/TI: garante disponibilidade, segurança básica e suporte.

  3.3 acesso baseado em papéis

- SDR: pode iniciar conversas, usar templates de prompts e ajustar tom.
- Closer: idêntico ao SDR, com foco em negociação e objeções.
- Gestor Comercial: acesso livre ao chat e templates, sem controles extras.
- Ops/TI: gerencia parâmetros técnicos e limites de uso; sem login.

4. requisitos funcionais

- chat básico com streaming de resposta (Prioridade: Alta)
  - enviar mensagens e visualizar respostas em tempo real.
  - indicador de "pensando" e possibilidade de parar geração.
- seleção de contexto/processo (Prioridade: Alta)
  - escolher entre modos SDR/Closer e objetivos (ex.: qualificar, objeções, follow-up).
- templates e sugestões (Prioridade: Alta)
  - prompts prontos e sugestões de próximo passo.
- controles de tom e formato (Prioridade: Média)
  - alternar entre breve/detalhado, formal/informal.
- copiar e exportar conversa (Prioridade: Média)
  - copiar resposta e exportar sessão como .txt.
- feedback da resposta (Prioridade: Média)
  - 👍👎 com motivo para melhoria contínua (apenas agregação anônima).
- gerenciamento de sessão (Prioridade: Alta)
  - limpar conversa atual e iniciar nova sessão.
- tratamento de erros e limites (Prioridade: Alta)
  - mensagens claras para timeouts, limites e indisponibilidade do LLM.

5. experiência do usuário

5.1 pontos de entrada e fluxo do primeiro acesso

- acesso por link interno direto à página de chat.
- primeiro acesso abre o chat com breve onboarding inline sobre recursos.

  5.2 experiência principal

- abrir o chat: usuário acessa a página principal de conversa.
  a página carrega rapidamente e destaca campo de mensagem com foco automático.
- selecionar contexto: escolhe modo (SDR/Closer) e objetivo da conversa.
  presets claros e editáveis ajudam a definir o contexto em 1 clique.
- enviar primeira mensagem: descreve lead, situação ou pergunta.
  suportar enter para enviar e shift+enter para quebra de linha.
- receber resposta: visualiza streaming e pode interromper geração.
  exibir indicador de status e botão "parar" visível.
- seguir sugestões: usa chips de próximo passo sugeridos.
  sugestões curtas, relevantes e clicáveis para fluidez.
- ajustar tom/formato: alterna entre breve/detalhado e formal/informal.
  alternadores simples com estado persistente na sessão.
- copiar/exportar: copia resposta ou exporta sessão atual.
  ações acessíveis por ícone em cada mensagem e no topo.
- encerrar sessão: limpa conversa e retorna ao estado inicial.
  confirmação leve evita limpeza acidental.

  5.3 recursos avançados e casos extremos

- reexecutar última resposta (regenerate) com a mesma entrada.
- lidar com respostas longas e cortes por limite de tokens.
- fallback para mensagem de erro clara e opção de tentar novamente.
- aviso para não inserir PII sensível.

  5.4 destaques de ui/ux

- layout de chat moderno, responsivo e acessível.
- estados visuais: digitando, carregando, erro, vazio.
- atalhos de teclado e comandos rápidos (/comandos futuros).
- mensagens do sistema discretas e úteis.

6. narrativa

marina é uma SDR que deseja melhorar a abordagem inicial com um lead porque precisa gerar mais reuniões qualificadas. ela acessa a ferramenta e, em poucos passos, define o contexto SDR, descreve o lead e recebe sugestões práticas e objetivas. isso a ajuda a agir com confiança e rapidez, padronizando a qualidade do discurso e elevando seus resultados.

7. métricas de sucesso

7.1 métricas centradas no usuário

- tempo até a primeira resposta (p50/p95)
- satisfação da resposta (👍👎)
- tarefas resolvidas por sessão

  7.2 métricas de negócio

- adoção (usuários únicos/dia)
- conversas por usuário por dia
- redução do tempo médio de preparação

  7.3 métricas técnicas

- latência p95 de resposta do LLM
- taxa de erros por sessão
- disponibilidade do serviço

8. considerações técnicas

8.1 pontos de integração

- api do agente gpt (endpoint interno/fornecedor)
- serviço de telemetria simples (agregado e anônimo)

  8.2 armazenamento de dados e privacidade

- sem persistência de conversas no servidor; somente sessão no cliente.
- coletar apenas métricas agregadas e anônimas.
- aviso explícito para não inserir PII ou segredos.

  8.3 escalabilidade e desempenho

- streaming de tokens (SSE/HTTP) para boa percepção de velocidade.
- controlar concorrência e limites de tamanho de prompt.
- timeouts e retries com backoff.

  8.4 desafios potenciais

- alucinações e respostas fora de política.
- custo de uso do LLM versus valor gerado.
- gestão de limites de tokens e latência.

9. marcos e sequenciamento

9.1 estimativa do projeto

- Médio: 2-4 semanas

  9.2 tamanho e composição da equipe

- equipe pequena: 2-4 pessoas no total
- 1 gerente de produto, 1-2 engenheiros, 1 designer/ux, 1 qa

  9.3 fases sugeridas

- fase 1: chat básico, contexto e streaming (1-2 semanas)
  entregáveis chave: página de chat, modos sdr/closer, envio/recebimento, loading/erro.
- fase 2: templates, sugestões e controles de tom (1 semana)
  entregáveis chave: prompts prontos, sugestões de próximo passo, breve/detalhado, formal/informal.
- fase 3: exportação, feedback e hardening (1 semana)
  entregáveis chave: copiar/exportar, 👍👎, limites/erros robustos.

10. histórias de usuário

### 10.1. acessar o chat sem login

ID: US-001

Descrição: como usuário comercial, quero acessar o chat via link interno sem autenticação para começar a usar rapidamente.

Critérios de aceitação:

- o chat abre sem exigir credenciais.
- o campo de mensagem recebe foco automático.
- um onboarding curto explica recursos principais.

### 10.2. selecionar contexto sdr/closer e objetivo

ID: US-002

Descrição: como usuário, quero escolher o modo (sdr/closer) e objetivo (ex.: objeções) para orientar as respostas.

Critérios de aceitação:

- há presets visíveis para modo e objetivo.
- a seleção impacta imediatamente as respostas.
- o usuário pode alterar a seleção a qualquer momento.

### 10.3. enviar mensagem e receber resposta com streaming

ID: US-003

Descrição: como usuário, quero enviar mensagens e ver respostas chegando em tempo real para decidir mais rápido.

Critérios de aceitação:

- enter envia e shift+enter quebra linha.
- indicador de processamento é mostrado.
- resposta é renderizada por streaming.

### 10.4. interromper geração e tentar novamente

ID: US-004

Descrição: como usuário, quero parar a geração e reexecutar para ajustar resultados.

Critérios de aceitação:

- existe botão de parar enquanto gera.
- há ação de regenerate após parar ou concluir.
- estado de erro oferece tentar novamente.

### 10.5. usar templates de prompts

ID: US-005

Descrição: como usuário, quero inserir prompts prontos para acelerar minhas interações.

Critérios de aceitação:

- catálogo curto de templates visível.
- inserir template preenche o campo de mensagem editável.
- templates respeitam modo/objetivo ativos.

### 10.6. receber sugestões de próximo passo

ID: US-006

Descrição: como usuário, quero clicar em sugestões de follow-up para manter o ritmo.

Critérios de aceitação:

- chips de sugestão aparecem junto à resposta.
- ao clicar, nova mensagem é enviada.
- sugestões são contextuais e curtas.

### 10.7. ajustar tom e formato

ID: US-007

Descrição: como usuário, quero alternar entre breve/detalhado e formal/informal.

Critérios de aceitação:

- controles de tom/forma estão acessíveis no topo.
- a mudança reflete na próxima resposta.
- o estado persiste durante a sessão atual.

### 10.8. copiar resposta

ID: US-008

Descrição: como usuário, quero copiar uma resposta para reutilizá-la.

Critérios de aceitação:

- ícone de copiar em cada mensagem do assistente.
- feedback visual de "copiado".
- o conteúdo mantém quebras de linha.

### 10.9. exportar conversa da sessão

ID: US-009

Descrição: como usuário, quero exportar a conversa atual em .txt.

Critérios de aceitação:

- ação de exportar disponível no cabeçalho.
- arquivo inclui mensagens na ordem correta.
- nenhum dado é enviado ao servidor para exportar.

### 10.10. limpar conversa

ID: US-010

Descrição: como usuário, quero limpar a sessão e começar do zero.

Critérios de aceitação:

- ação "limpar" exige confirmação leve.
- histórico desaparece e volta ao estado inicial.
- seleções de contexto retornam ao padrão.

### 10.11. ver e entender mensagens de erro

ID: US-011

Descrição: como usuário, quero mensagens de erro claras com próximos passos.

Critérios de aceitação:

- mensagens indicam causa provável (timeout, limite, indisponível).
- sugerem ação (tentar novamente, reduzir tamanho, aguardar).
- não expõem detalhes técnicos sensíveis.

### 10.12. dar feedback 👍👎

ID: US-012

Descrição: como usuário, quero avaliar respostas para ajudar a melhorar a qualidade.

Critérios de aceitação:

- botões 👍👎 em cada resposta.
- opção de motivo breve após o clique.
- dados coletados apenas de forma agregada/anônima.

### 10.13. atalhos de teclado

ID: US-013

Descrição: como usuário, quero usar atalhos (ex.: / para comandos, esc para cancelar).

Critérios de aceitação:

- esc cancela geração em curso.
- / abre menu de comandos rápidos (quando disponível).
- ajuda de atalhos acessível no cabeçalho.

### 10.14. aviso de privacidade

ID: US-014

Descrição: como usuário, quero ser lembrado a não inserir PII/segredos.

Critérios de aceitação:

- aviso discreto visível próximo ao campo de mensagem.
- link para política interna opcional.
- não bloqueia o fluxo de uso.
