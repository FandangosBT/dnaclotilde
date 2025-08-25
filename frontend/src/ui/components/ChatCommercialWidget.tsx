import React, { useEffect, useMemo, useRef, useState, FormEvent, KeyboardEvent } from 'react'
import { Bot, CornerDownLeft, Mic, Paperclip } from 'lucide-react'
import { useChatStore } from '../../store'
import InteractiveHoverButton from './InteractiveHoverButton'
import { useHoverControls } from '../hooks/useHoverControls'

// Tipagens básicas
 type Sender = 'ai' | 'user'
 interface ChatMsg { id: string; sender: Sender; content: string; at: number }

// Hook: useLocalStorage — persiste estado com chave e serialização segura
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // noop
    }
  }, [key, value])

  return [value, setValue] as const
}

// Hook: useAutoScroll — rola para o fim em novas mensagens, respeitando se usuário "prendeu" o scroll
function useAutoScroll(dep: unknown[]) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onScroll = () => {
      const threshold = 80 // px a partir do fim
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = distanceFromBottom < threshold
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    if (stickToBottomRef.current) {
      const prefersReduced =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollTo({ top: el.scrollHeight, behavior: prefersReduced ? 'auto' : 'smooth' })
    }
  }, dep)

  return viewportRef
}

// UI Primitivos (botão icônico e avatar)
const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...rest }) => {
  const { hoverIn, hoverOut, pressIn, pressOut } = useHoverControls()
  return (
    <button
      className={
        'inline-flex items-center justify-center h-9 w-9 rounded-full text-gold/80 border border-border bg-transparent hover:bg-surface-2/40 hover:text-gold focus-visible-ring ring-gold transition-colors will-change-transform ' +
        className
      }
      onMouseEnter={(e) => !(e.currentTarget as HTMLButtonElement).disabled && hoverIn(e.currentTarget)}
      onMouseLeave={(e) => hoverOut(e.currentTarget)}
      onMouseDown={(e) => !(e.currentTarget as HTMLButtonElement).disabled && pressIn(e.currentTarget)}
      onMouseUp={(e) => pressOut(e.currentTarget)}
      {...rest}
    >
      {children}
    </button>
  )
}

const Avatar: React.FC<{ src?: string; alt?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ src, alt = '', className = '', ...rest }) => (
  <div className={'h-10 w-10 rounded-full overflow-hidden ring-2 ring-transparent ' + className} aria-label={alt} {...rest}>
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    ) : (
      <div className="h-full w-full bg-gold text-black grid place-content-center font-coder">AI</div>
    )}
  </div>
)

// Componente principal
export default function ChatCommercialWidget() {
  const [messages, setMessages] = useLocalStorage<ChatMsg[]>(
    'chat-commercial/messages',
    [{ id: crypto.randomUUID(), sender: 'ai', content: 'Olá! Sou sua IA de apoio a SDRs. Como posso ajudar?', at: Date.now() }],
  )
  const [input, setInput] = useLocalStorage<string>('chat-commercial/draft', '')
  const [isLoading, setIsLoading] = useState(false)

  const viewportRef = useAutoScroll([messages.length, isLoading])

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const value = input.trim()
    if (!value) return

    const userMsg: ChatMsg = { id: crypto.randomUUID(), sender: 'user', content: value, at: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    // Simulação de resposta da IA (substitua pela chamada ao backend da sua app)
    setTimeout(() => {
      const aiMsg: ChatMsg = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: 'Entendi. Quer que eu gere perguntas de qualificação ou um script de abordagem?',
        at: Date.now(),
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsLoading(false)
    }, 850)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const humanTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const userAvatar = useMemo(
    () => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop',
    [],
  )
  const aiAvatar = useMemo(
    () => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop',
    [],
  )

  return (
    <div className="h-[640px] w-full max-w-3xl mx-auto bg-surface-1 text-primary rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,.25)] border border-border overflow-hidden font-area">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-1">
        <div className="h-8 w-8 rounded-lg grid place-content-center bg-gold text-black">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-coder text-xl leading-none tracking-tight">Dona Clotilde - Bruxa do 71</h1>
          <h2 className="text-xs text-secondary leading-snug">Especialista em potencializar resultados de PMEs com soluções SaaS sob medida – direto ao ponto e com olhar consultivo</h2>
        </div>
      </header>

      {/* Body */}
      <main className="h-[calc(100%-112px)] flex flex-col">
        <div
          ref={viewportRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className={`flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-surface-2 ${
            (useChatStore((s) => s.density) === 'compact' && 'space-y-2') ||
            (useChatStore((s) => s.density) === 'spacious' && 'space-y-4') ||
            'space-y-3'
          }`}
        >
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user'
            const groupedWithPrev = idx > 0 && messages[idx - 1].sender === m.sender
            const showAiAvatar = m.sender === 'ai' && !groupedWithPrev

            return (
              <div key={m.id} className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <Avatar src={showAiAvatar ? aiAvatar : undefined} alt="Assistente IA" className={!showAiAvatar ? 'opacity-0' : ''} />
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed border border-border ${
                    isUser ? 'bg-gold text-black' : 'bg-surface-1 text-primary'
                  } ${groupedWithPrev ? 'rounded-t-md -mt-2' : ''}`}
                >
                  <p className="emoji-safe">{m.content}</p>
                  <span className={`mt-1 block text-[11px] opacity-70 ${isUser ? 'text-black/70' : 'text-secondary'}`}>{humanTime(m.at)}</span>
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="flex items-end gap-3 justify-start">
              <Avatar src={aiAvatar} alt="Assistente IA" />
              <div className="max-w-[75%] rounded-2xl px-4 py-3 border border-border bg-surface-1">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-gold animate-pulse"></span>
                  <span className="h-2 w-2 rounded-full bg-gold animate-pulse [animation-delay:120ms]"></span>
                  <span className="h-2 w-2 rounded-full bg-gold animate-pulse [animation-delay:240ms]"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={(e) => handleSubmit(e)} className="border-t border-border bg-surface-1 p-3">
          <div className="relative flex items-end gap-2 rounded-xl border border-border bg-surface-2 focus-within:ring-2 ring-gold p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o lead, contexto ou pergunta…"
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none border-0 text-primary placeholder-muted max-h-36 p-2"
            />

            <div className="flex items-center gap-1 pb-1">
              <IconButton type="button" aria-label="Anexar arquivo"><Paperclip className="h-4 w-4"/></IconButton>
              <IconButton type="button" aria-label="Gravar áudio"><Mic className="h-4 w-4"/></IconButton>
              <InteractiveHoverButton
                type="submit"
                aria-label="Enviar mensagem"
                aria-disabled={!input.trim() || isLoading ? true : undefined}
                title="Enviar (Enter) / Nova linha (Shift+Enter)"
                onClick={(e) => {
                  if (!input.trim() || isLoading) {
                    e.preventDefault()
                    e.stopPropagation()
                  }
                }}
              >
                Enviar <CornerDownLeft className="h-3.5 w-3.5"/>
              </InteractiveHoverButton>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

<p className="text-sm text-secondary">Especialista em potencializar resultados de PMEs com soluções SaaS sob medida – direto ao ponto e com olhar consultivo</p>