# Design System — Chat Comercial

Princípios

- Acessibilidade primeiro (WCAG 2.1 AA+)
- Consistência visual e semântica (tokens e utilitários)
- Performance e responsividade
- Microinterações suaves, reversíveis e respeitando prefers-reduced-motion

Tokens (CSS Custom Properties)

- Tipografia
  - --font-area: Inter, system-ui… (texto/base)
  - --font-coder: JetBrains Mono… (títulos/H1–H4, botões principais)
- Cores de superfície
  - --color-bg-root: fundo geral da aplicação
  - --color-bg-1: superfícies/cards principais
  - --color-bg-2: hover/nível 2
  - --color-bg-3: contraste forte (ex.: bolha do usuário)
  - --color-border: bordas sutis
- Texto
  - --color-text-primary, --color-text-secondary, --color-text-muted, --color-text-subtle
- Acento
  - --color-accent-gold: #ede09f (dourado)
  - --color-accent-gold-hover: variação p/ hover
- Motion
  - --motion-duration-fast: 200ms
  - --motion-duration-normal: 300ms
  - --motion-duration-slow: 500ms
  - --motion-ease-standard: cubic-bezier(0.2, 0, 0, 1)
  - --motion-ease-emphasized: cubic-bezier(0.32, 0, 0, 1)

Utilitários (classes)

- Background: bg-root, bg-surface-1/2/3, bg-gold, bg-gold-80/60/40
- Borda: border-border, border-gold
- Texto: text-primary/secondary/muted/subtle, text-gold, text-danger
- Foco: ring-gold (Tailwind), focus-visible-ring (box-shadow acessível)
- Interação: interactive, hover:bg-surface-2, hover:bg-gold-hover

Radii e timing (Tailwind theme)

- borderRadius: card = 16px, pill = 9999px
- transitionTimingFunction: standard, emphasized
- transitionDuration: fast, normal, slow

Acessibilidade

- Contraste mínimo: 4.5:1 texto normal; 3:1 títulos grandes (validado no Lighthouse/axe)
- Foco visível: use ring-gold ou focus-visible-ring em elementos interativos
- Navegação por teclado: ordem lógica; Escape fecha diálogos; Enter envia; Shift+Enter quebra linha
- Leitores de tela:
  - aria-live="polite" para feedback de geração (ex.: #composer-status)
  - roles/landmarks: header/banner, main, dialog
  - labels/aria-pressed nos toggles (modo/tom/formalidade)
- Reduzir movimento: respeitar prefers-reduced-motion (desativar transform/transition quando ativo)

Componentes

- Header
  - H1 com fonte coder, subtítulo com text-secondary
  - Ícone com alt descritivo
  - Ações (modo, tom, formalidade) como botões com ring-gold, text-gold e bg-surface-1; hover:bg-surface-2
  - Select com border e ring em focus-visible

- ChatBubble
  - Usuário: alinhado à direita; fundo dourado (bg-gold/text-black); radius card
  - Agente: alinhado à esquerda; fundo surface-2; texto primary
  - Conteúdos do agente podem ter títulos em negrito para escaneabilidade

- SuggestionChip
  - Base: pill; bg-surface-1, text-gold; borda aparece no hover (border-gold)
  - Ativo: bg-gold text-black
  - Interações: transições ~200–300ms, focus visível, navegável por setas

- Toolbar/Ações secundárias
  - Distribuição discreta abaixo do header; usar text-secondary e hover claro

- Botão Enviar (Composer)
  - Padrão: bg-gold text-black, radius md/pill
  - Estados: hover (bg-gold-hover), focus (ring 2px dourado), disabled (opacidade 60%)
  - Acessibilidade: aria-disabled quando input vazio/limite; manter tabIndex=0 para focabilidade no Safari/WebKit; handler previne clique quando desabilitado

- Diálogo de Confirmação
  - Botões com ring-gold; foco visível; Escape fecha

Microinterações (GSAP)

- Hovers/press leves em botões/chips (scale/translateY sutil)
- Entrada de mensagens: fade-slide-up em 0.3–0.6s
- Regras: reversibilidade, sem bloqueio, não interferir com foco/aria

Responsividade

- Layout fluido para sm/md/lg; chips com rolagem horizontal quando necessário
- Espaçamentos consistentes entre mensagens e seções

Testes e Qualidade

- E2E a11y.spec: navegação por Tab do textarea → Enviar; landmarks; aria-live
- Cross-browser: Chromium, Firefox, WebKit; dispositivos: iPhone 12, Pixel 5
- Lighthouse: sem regressão nas categorias principais; contraste 0 falhas

Rollout e Flags

- VITE_DEBUG_UI: controlar métricas/diagnósticos visuais (produção: false; staging: true)
- Rollout gradual com cookie/header X-FF-UI=1 para público interno

Boas práticas

- Não duplicar estilos; reutilizar utilitários e tokens
- Não alterar tokens globais sem alinhamento prévio
- Preferir semântica correta de HTML com ARIA mínima necessária
