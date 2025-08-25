/*
====================================================================
PROMPT COMPLETO PARA IDE — Chat Comercial (React + Tailwind)
Inclui:
1) tailwind.config + tokens de design (cores, fontes, radius)
2) globals.css com fontes e utilidades
3) Componente único <ChatCommercialWidget />
   - Bolhas de chat (usuário/IA), avatar do agente
   - Autoscroll inteligente (hook useAutoScroll)
   - Persistência em localStorage (hook useLocalStorage)
   - Enter envia / Shift+Enter quebra linha

▶ Como usar
- Crie/atualize `tailwind.config.js`, `globals.css` com os trechos abaixo.
- Instale deps: `npm i lucide-react` (ou `pnpm add lucide-react`).
- Crie `ChatCommercialWidget.tsx` com o conteúdo TODO desse arquivo
  (você pode separar hooks em arquivos se preferir).
====================================================================
*/

// ------------------------------
// 1) tailwind.config.js (cole no seu projeto)
// ------------------------------
/*
module.exports = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#ede09f",
          hover: "#f2e8a0",
        },
        ink: "#1a1a1a",
        border: "#2a2a2a",
        muted: "#bbbbbb",
      },
      fontFamily: {
        coder: ["Coder", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        area: ["Area Normal", "system-ui", "Segoe UI", "Inter", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem", // 20px
      },
      boxShadow: {
        soft: "0 6px 20px rgba(0,0,0,.25)",
      },
    },
  },
  plugins: [],
};
*/

// ------------------------------
// 2) globals.css (importado no app)
// ------------------------------
/*
@font-face {
  font-family: 'Coder';
  src: local('Coder'); /* Substitua por @font-face real da sua família */
  font-display: swap;
}
@font-face {
  font-family: 'Area Normal';
  src: local('Area Normal'); /* Substitua por @font-face real da sua família */
  font-display: swap;
}

:root {
  --bg: #1a1a1a; /* ink */
  --fg: #ffffff;
  --muted: #bbbbbb;
  --border: #2a2a2a;
  --brand: #ede09f;
  --brand-hover: #f2e8a0;
}

html, body, #__next { height: 100%; }
body { background: var(--bg); color: var(--fg); }

/* Anel de foco consistente (WCAG) */
*:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--brand); border-radius: 6px; }
*/

// ------------------------------
// 3) ChatCommercialWidget.tsx — componente completo
// ------------------------------
import React, { useEffect, useMemo, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { Bot, CornerDownLeft, Mic, Paperclip } from "lucide-react";

// Tipagens básicas
type Sender = "ai" | "user";
interface ChatMsg { id: string; sender: Sender; content: string; at: number; }

// ------------------------------
// Hook: useLocalStorage — persiste estado com chave e serialização segura
// ------------------------------
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // noop
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// ------------------------------
// Hook: useAutoScroll — rola para o fim em novas mensagens
// Mantém controle se o usuário "prendeu" o scroll acima do threshold
// ------------------------------
function useAutoScroll(dep: unknown[]) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 80; // px a partir do fim
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < threshold;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      // rola suavemente ao final
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, dep);

  return viewportRef;
}

// ------------------------------
// UI Primitivos (buttons e avatar simples para evitar dependências)
// ------------------------------
const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", children, ...rest }) => (
  <button
    className={
      "inline-flex items-center justify-center h-9 w-9 rounded-full text-[color:var(--brand)]/80 hover:bg-[color:var(--brand)] hover:text-black transition focus-visible:outline-none " +
      className
    }
    {...rest}
  >
    {children}
  </button>
);

const Avatar: React.FC<{ src?: string; alt?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ src, alt = "", className = "", ...rest }) => (
  <div className={"h-10 w-10 rounded-full overflow-hidden ring-2 ring-transparent " + className} aria-label={alt} {...rest}>
    {src ? (
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    ) : (
      <div className="h-full w-full bg-[color:var(--brand)] text-black grid place-content-center font-coder">AI</div>
    )}
  </div>
);

// ------------------------------
// Componente principal
// ------------------------------
export default function ChatCommercialWidget() {
  const [messages, setMessages] = useLocalStorage<ChatMsg[]>(
    "chat-commercial/messages",
    [
      { id: crypto.randomUUID(), sender: "ai", content: "Olá! Sou sua IA de apoio a SDRs. Como posso ajudar?", at: Date.now() },
    ]
  );
  const [input, setInput] = useLocalStorage<string>("chat-commercial/draft", "");
  const [isLoading, setIsLoading] = useState(false);

  const viewportRef = useAutoScroll([messages.length, isLoading]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const value = input.trim();
    if (!value) return;

    const userMsg: ChatMsg = { id: crypto.randomUUID(), sender: "user", content: value, at: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulação de resposta da IA (substitua pela chamada de backend)
    setTimeout(() => {
      const aiMsg: ChatMsg = {
        id: crypto.randomUUID(),
        sender: "ai",
        content: "Entendi. Quer que eu gere perguntas de qualificação ou um script de abordagem?",
        at: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 850);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const humanTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const userAvatar = useMemo(() => "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop", []);
  const aiAvatar = useMemo(() => "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop", []);

  return (
    <div className="h-[640px] w-full max-w-3xl mx-auto bg-ink text-white rounded-2xl shadow-soft border border-border overflow-hidden font-area">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-ink">
        <div className="h-8 w-8 rounded-lg grid place-content-center bg-[color:var(--brand)] text-black">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-coder text-xl leading-none tracking-tight">Chat Comercial</h1>
          <p className="text-sm text-muted">IA de apoio a SDRs</p>
        </div>
      </header>

      {/* Body */}
      <main className="h-[calc(100%-112px)] flex flex-col">
        <div
          ref={viewportRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 bg-[#111]"
        >
          {messages.map((m, idx) => {
            const isUser = m.sender === "user";
            const showAiAvatar = m.sender === "ai" && (idx === 0 || messages[idx - 1].sender !== "ai");

            return (
              <div key={m.id} className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <Avatar src={showAiAvatar ? aiAvatar : undefined} alt="Assistente IA" className={!showAiAvatar ? "opacity-0" : ""} />
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed border border-border ${
                    isUser ? "bg-[color:var(--brand)] text-black" : "bg-ink text-white"
                  }`}
                >
                  <p>{m.content}</p>
                  <span className={`mt-1 block text-[11px] opacity-70 ${isUser ? "text-black/70" : "text-white/70"}`}>{humanTime(m.at)}</span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-end gap-3 justify-start">
              <Avatar src={aiAvatar} alt="Assistente IA" />
              <div className="max-w-[75%] rounded-2xl px-4 py-3 border border-border bg-ink">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--brand)] animate-pulse"></span>
                  <span className="h-2 w-2 rounded-full bg-[color:var(--brand)] animate-pulse [animation-delay:120ms]"></span>
                  <span className="h-2 w-2 rounded-full bg-[color:var(--brand)] animate-pulse [animation-delay:240ms]"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={(e) => handleSubmit(e)} className="border-t border-border bg-ink p-3">
          <div className="relative flex items-end gap-2 rounded-xl border border-border bg-[#111] focus-within:ring-2 focus-within:ring-[color:var(--brand)] p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o lead, contexto ou pergunta…"
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none border-0 text-white placeholder-muted max-h-36 p-2"
            />

            <div className="flex items-center gap-1 pb-1">
              <IconButton type="button" aria-label="Anexar arquivo"><Paperclip className="h-4 w-4"/></IconButton>
              <IconButton type="button" aria-label="Gravar áudio"><Mic className="h-4 w-4"/></IconButton>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="inline-flex items-center gap-1.5 bg-[color:var(--brand)] text-black font-coder px-3 py-2 rounded-lg hover:bg-[color:var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar mensagem"
                title="Enviar (Enter) / Nova linha (Shift+Enter)"
              >
                Enviar <CornerDownLeft className="h-3.5 w-3.5"/>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

// ------------------------------
// FIM — Se quiser separar, mova os hooks para /hooks e os primitivos para /components
// ------------------------------
