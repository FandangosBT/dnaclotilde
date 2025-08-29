import React, { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../store'
import Header from './components/Header'
import ChatMessage from './components/ChatMessage'
import TemplatesDrawer from './components/TemplatesDrawer'
import { parseSSEChunk } from '../utils/sse'
import ConfirmDialog from './components/ConfirmDialog'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import SecondaryBar from './components/SecondaryBar'
import { useHoverControls } from './hooks/useHoverControls'
import { logUX } from '../utils/logger'
import { createAndPollTranscription } from '../utils/transcription'
import { uploadAndPollTranscription } from '../utils/transcription'
import SuggestionsChips from './components/SuggestionsChips'
import InteractiveHoverButton from './components/InteractiveHoverButton'

// Ajuste robusto da base da API:
// - Em produção: ignora VITE_BACKEND_URL quando for localhost/127.0.0.1 ou vazia e usa "/api" (mesmo domínio/Vercel Functions)
// - Em desenvolvimento: usa VITE_BACKEND_URL (ou fallback http://localhost:3001)
const isProd = import.meta.env.PROD
const fromEnv = (import.meta.env.VITE_BACKEND_URL || '').trim()
const API_BASE = isProd
  ? (fromEnv && !/^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(fromEnv) ? fromEnv : '')
  : (fromEnv || 'http://localhost:3001')
const apiUrl = (path: string) => `${API_BASE}${API_BASE ? '' : '/api'}${path}`

// Config de transcrição via env (com defaults e sanitização)
const num = (v: unknown, fb: number, min?: number, max?: number) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return fb
  const clamped = (min != null && n < min) ? min : (max != null && n > max) ? max : n
  return clamped
}
const TRANSCRIBE_TIMEOUT_MS = num(import.meta.env.VITE_TRANSCRIBE_TIMEOUT_MS, 120_000, 5_000, 10 * 60_000)
const TRANSCRIBE_INITIAL_DELAY_MS = num(import.meta.env.VITE_TRANSCRIBE_INITIAL_DELAY_MS, 1_000, 100, 30_000)
const TRANSCRIBE_MAX_DELAY_MS = num(import.meta.env.VITE_TRANSCRIBE_MAX_DELAY_MS, 5_000, 500, 60_000)
const TRANSCRIBE_BACKOFF_FACTOR = num(import.meta.env.VITE_TRANSCRIBE_BACKOFF_FACTOR, 1.5, 1.1, 5)

export default function App() {
  const messages = useChatStore((state) => state.messages)
  const addMessage = useChatStore((state) => state.addMessage)
  const appendToLastMessage = useChatStore((state) => state.appendToLastMessage)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const removeLastAssistantMessage = useChatStore((state) => state.removeLastAssistantMessage)
  const setSuggestions = useChatStore((state) => state.setSuggestions)

  const mode = useChatStore((state) => state.mode)
  const tone = useChatStore((state) => state.tone)
  const formality = useChatStore((state) => state.formality)
  const objective = useChatStore((state) => state.objective)
  const setMode = useChatStore((state) => state.setMode)
  const setTone = useChatStore((state) => state.setTone)
  const setFormality = useChatStore((state) => state.setFormality)
  const setObjective = useChatStore((state) => state.setObjective)

  const streaming = useChatStore((state) => state.streaming)
  const setStreaming = useChatStore((state) => state.setStreaming)
  const error = useChatStore((state) => state.error)
  const setError = useChatStore((state) => state.setError)
  const cancelStreaming = useChatStore((state) => state.cancelStreaming)
  const templatesOpen = useChatStore((state) => state.templatesOpen)
  const templates = useChatStore((state) => state.templates)
  const loadingTemplates = useChatStore((state) => state.loadingTemplates)
  const setTemplatesOpen = useChatStore((state) => state.setTemplatesOpen)
  const setTemplates = useChatStore((state) => state.setTemplates)
  const setLoadingTemplates = useChatStore((state) => state.setLoadingTemplates)
  const setAbortController = useChatStore((state) => state.setAbortController)
  const updateLastMessage = useChatStore((state) => state.updateLastMessage)

  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const shortcutsModalOpen = useChatStore((s) => s.shortcutsModalOpen)
  const setShortcutsModalOpen = useChatStore((s) => s.setShortcutsModalOpen)
  const privacyNoticeShown = useChatStore((s) => s.privacyNoticeShown)
  const setPrivacyNoticeShown = useChatStore((s) => s.setPrivacyNoticeShown)
  const [metrics, setMetrics] = useState<{
    firstTokenMs?: number
    totalMs?: number
    chunks: number
    chars: number
  } | null>(null)

  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus()
    }
    window.addEventListener('focus-chat-input', handler as any)
    return () => window.removeEventListener('focus-chat-input', handler as any)
  }, [])

  // Auto-scroll para a última mensagem, respeitando prefers-reduced-motion
  useEffect(() => {
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'end' })
  }, [messages.length, streaming])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // não interfere ao digitar em inputs quando for caractere normal
      const target = e.target as HTMLElement
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!isTyping) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        // '?' geralmente é Shift+'/'
        if (!isTyping) {
          e.preventDefault()
          setShortcutsModalOpen(!shortcutsModalOpen)
        }
      } else if (e.key === 'Escape') {
        // cancela streaming se ativo
        if (streaming) {
          cancelStreaming()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [streaming, cancelStreaming, setShortcutsModalOpen, shortcutsModalOpen])

  useEffect(() => {
    if (privacyNoticeShown) return
    try {
      const seen = localStorage.getItem('privacy_notice_seen')
      if (seen === '1') {
        setPrivacyNoticeShown(true)
      }
    } catch {}
  }, [privacyNoticeShown, setPrivacyNoticeShown])

  const dismissPrivacy = () => {
    try {
      localStorage.setItem('privacy_notice_seen', '1')
    } catch {}
    setPrivacyNoticeShown(true)
  }
  const openTemplates = () => {
    // Abre o drawer imediatamente para não depender da latência/rede
    if (templatesOpen) return
    setTemplatesOpen(true)

    if (loadingTemplates) return
    setLoadingTemplates(true)

    // Opcional: limpar lista enquanto carrega
    // setTemplates({})

    fetch(apiUrl(`/templates?mode=${mode}`))
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates))
      .catch(() => setTemplates({}))
      .finally(() => {
        setLoadingTemplates(false)
        // Drawer já está aberto; não fechar/abrir aqui
      })
  }
  const closeTemplates = () => setTemplatesOpen(false)
  const insertTemplate = (t: string) => {
    setInput((prev) => (prev ? prev + '\n' + t : t))
    closeTemplates()
    inputRef.current?.focus()
  }
  const copyMessage = async (text: string) => {
    await navigator.clipboard.writeText(text)
    showToast('Copiado!')
  }
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const postFeedback = async (rating: 'up' | 'down', reason?: string) => {
    try {
      await fetch(apiUrl('/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, reason }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const exportSession = () => {
    const when = new Date().toLocaleString()
    const header = [
      `Sessão exportada: ${when}`,
      `Modo: ${mode} | Tom: ${tone} | Formalidade: ${formality} | Objetivo: ${objective}`,
      ''.padEnd(40, '-'),
    ].join('\n')
    const contentBody = messages
      .map(
        (m, idx) => `#${idx + 1} ${m.role === 'user' ? 'Usuário' : 'Assistente'}:\n${m.content}\n`,
      )
      .join('\n')
    const content = `${header}\n\n${contentBody}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    a.download = `sessao_chat_${ts}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('Sessão exportada')
  }

  const clearConversation = () => {
    if (streaming) return
    setConfirmOpen(true)
  }

  const confirmClear = () => {
    clearMessages()
    setConfirmOpen(false)
  }

  const regenerate = async () => {
    if (streaming) return
    let lastUserContent: string | null = null
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserContent = messages[i].content
        break
      }
    }
    if (!lastUserContent) return
    removeLastAssistantMessage()
    await sendMessage(lastUserContent)
  }

  const handleSuggest = (prompt: string) => {
    if (streaming) return
    setInput(prompt)
    inputRef.current?.focus()
  }

  // Microinterações padrão (GSAP) para controles de UI
  const { bind } = useHoverControls({ hoverScale: 1.04 })

  const [transcribeOpen, setTranscribeOpen] = useState(false)
  const [transcribeUrl, setTranscribeUrl] = useState('')
  const [transcribeMode, setTranscribeMode] = useState<'url' | 'file'>('url')
  const [transcribeFile, setTranscribeFile] = useState<File | null>(null)

  // Anexos (imagem/texto)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachMode, setAttachMode] = useState<'image' | 'text'>('image')
  const [attachText, setAttachText] = useState('')
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [attachments, setAttachments] = useState<Array<{ kind: 'image' | 'text'; content: string; name?: string; mime?: string }>>([])
  const [attachTextName, setAttachTextName] = useState<string | null>(null)
  const [attachTextMime, setAttachTextMime] = useState<string | null>(null)

  // Leitura de arquivo de texto e preenchimento do campo (dentro do componente)
  const handleAttachTextFileChange = (file: File | null) => {
    if (!file) return
    const MAX_MB = 1
    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`Arquivo muito grande (> ${MAX_MB}MB)`) 
      return
    }
    const isTextLike = file.type.startsWith('text/') || /\.(txt|md|csv|json|log|ya?ml|xml|html?|js|ts)$/i.test(file.name)
    if (!isTextLike) {
      showToast('Apenas arquivos de texto são suportados')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setAttachText(text)
      setAttachTextName(file.name)
      setAttachTextMime(file.type || 'text/plain')
      showToast('Arquivo de texto carregado')
    }
    reader.onerror = () => {
      showToast('Falha ao ler arquivo de texto')
    }
    reader.readAsText(file)
  }

  async function addAttachment() {
    if (attachMode === 'text') {
      const txt = attachText.trim()
      if (!txt) {
        showToast('Texto vazio')
        return
      }
      setAttachments((prev) => [
        ...prev,
        {
          kind: 'text',
          content: txt,
          name: attachTextName || 'nota.txt',
          mime: attachTextMime || 'text/plain',
        },
      ])
      setAttachText('')
      setAttachTextName(null)
      setAttachTextMime(null)
      setAttachOpen(false)
      showToast('Anexo de texto adicionado')
    } else {
      if (!attachFile) {
        showToast('Selecione uma imagem')
        return
      }
      const MAX_MB = 4
      if (attachFile.size > MAX_MB * 1024 * 1024) {
        showToast(`Arquivo muito grande (> ${MAX_MB}MB)`) 
        return
      }
      if (!attachFile.type.startsWith('image/')) {
        showToast('Apenas imagens são suportadas')
        return
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(attachFile)
      })
      setAttachments((prev) => [
        ...prev,
        { kind: 'image', content: dataUrl, name: attachFile.name, mime: attachFile.type },
      ])
      setAttachFile(null)
      setAttachOpen(false)
      showToast('Imagem anexada')
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  // Enviar mensagem com suporte a anexos (texto/imagem) e streaming SSE
  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return
    setError(null)
    setMetrics(null)

    // push user and placeholder assistant
    const nowIso = new Date().toISOString()
    addMessage({ role: 'user', content: text, timestamp: nowIso })
    addMessage({ role: 'assistant', content: '', timestamp: nowIso })
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    setAbortController(controller)

    const start = performance.now()
    let firstTokenMs: number | undefined = undefined
    let chunks = 0
    let chars = 0

    try {
      const res = await fetch(apiUrl('/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode, tone, formality, objective, attachments }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error('Falha ao iniciar streaming')

      // Limpa anexos após envio para evitar reuso acidental
      setAttachments([])

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let receivedAny = false
      let lastServerMessage: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const events = parseSSEChunk(chunk)
        for (const evt of events) {
          if (evt.chunk) {
            receivedAny = true
            appendToLastMessage(evt.chunk)
            chunks += 1
            chars += evt.chunk.length
            if (firstTokenMs === undefined) {
              firstTokenMs = performance.now() - start
              setMetrics({ firstTokenMs, chunks, chars })
              logUX({ firstTokenMs, chunks, chars })
            }
          } else if (evt.message) {
            lastServerMessage = evt.message
          } else if (evt.suggestions && Array.isArray(evt.suggestions)) {
            setSuggestions(evt.suggestions)
          }
        }
      }

      if (!receivedAny) {
        removeLastAssistantMessage()
        setError(
          lastServerMessage ||
            'Não foi possível obter resposta do LLM. Verifique a configuração do backend.',
        )
      }
    } catch (e: any) {
      const isAbort =
        e?.name === 'AbortError' ||
        String(e?.message || '').toLowerCase().includes('abort')
      if (!isAbort) {
        console.error(e)
        removeLastAssistantMessage()
        setError('Ocorreu um erro. Tente novamente.')
        logUX({ error: true })
      } else {
        // Cancelamento: remover placeholder e informar usuário
        removeLastAssistantMessage()
        setError(null)
        showToast('Cancelado')
      }
    } finally {
      const totalMs = performance.now() - start
      setMetrics((prev) => ({ firstTokenMs: prev?.firstTokenMs ?? firstTokenMs, totalMs, chunks, chars }))
      logUX({ firstTokenMs, totalMs, chunks, chars })
      setStreaming(false)
      setAbortController(null)
    }
  }

  // Transcrição (URL e Arquivo) — restauradas
  async function startTranscription(url: string) {
    setError(null)
    const nowIso = new Date().toISOString()
    addMessage({ role: 'user', content: `Transcrever: ${url}`, timestamp: nowIso })
    addMessage({ role: 'assistant', content: 'Iniciando transcrição...', timestamp: nowIso })
    setStreaming(true)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const text = await createAndPollTranscription({
        url,
        apiUrl,
        signal: controller.signal,
        onStatus: (status: string) => {
          updateLastMessage(`Transcrevendo... (${status})`)
        },
        timeoutMs: TRANSCRIBE_TIMEOUT_MS,
        initialDelayMs: TRANSCRIBE_INITIAL_DELAY_MS,
        maxDelayMs: TRANSCRIBE_MAX_DELAY_MS,
        backoffFactor: TRANSCRIBE_BACKOFF_FACTOR,
      })
      updateLastMessage(text || '(Sem conteúdo)')
      showToast('Transcrição concluída')
    } catch (e: any) {
      const isAbort =
        e?.name === 'AbortError' ||
        String(e?.message || '')
          .toLowerCase()
          .includes('abort')
      if (isAbort) {
        removeLastAssistantMessage()
        setError(null)
        showToast('Cancelado')
      } else {
        console.error(e)
        removeLastAssistantMessage()
        const msg =
          e?.message === 'INVALID_URL'
            ? 'URL inválida'
            : e?.message === 'CREATE_FAILED'
            ? 'Falha ao criar transcrição'
            : e?.message === 'INVALID_CREATE_RESPONSE'
            ? 'Resposta inválida ao criar transcrição'
            : e?.message === 'POLL_FAILED'
            ? 'Falha ao consultar transcrição'
            : e?.message === 'TIMEOUT'
            ? 'Tempo esgotado ao transcrever'
            : e?.message === 'TRANSCRIPTION_FAILED'
            ? 'Transcrição falhou'
            : 'Ocorreu um erro ao transcrever'
        setError(msg)
        showToast(msg)
      }
    } finally {
      setStreaming(false)
      setAbortController(null)
    }
  }

  async function startTranscriptionFromFile(file: File) {
    setError(null)
    const nowIso = new Date().toISOString()
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    addMessage({ role: 'user', content: `Transcrever arquivo: ${file.name} (${sizeMb} MB)`, timestamp: nowIso })
    addMessage({ role: 'assistant', content: 'Iniciando transcrição...', timestamp: nowIso })
    setStreaming(true)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const text = await uploadAndPollTranscription({
        file,
        apiUrl,
        signal: controller.signal,
        onStatus: (status: string) => {
          updateLastMessage(`Transcrevendo... (${status})`)
        },
        timeoutMs: TRANSCRIBE_TIMEOUT_MS,
        initialDelayMs: TRANSCRIBE_INITIAL_DELAY_MS,
        maxDelayMs: TRANSCRIBE_MAX_DELAY_MS,
        backoffFactor: TRANSCRIBE_BACKOFF_FACTOR,
      })
      updateLastMessage(text || '(Sem conteúdo)')
      showToast('Transcrição concluída')
    } catch (e: any) {
      const isAbort =
        e?.name === 'AbortError' ||
        String(e?.message || '').toLowerCase().includes('abort')
      if (isAbort) {
        removeLastAssistantMessage()
        setError(null)
        showToast('Cancelado')
      } else {
        console.error(e)
        removeLastAssistantMessage()
        const msg =
          e?.message === 'INVALID_FILE'
            ? 'Arquivo inválido'
            : e?.message === 'CREATE_FAILED'
            ? 'Falha ao criar transcrição'
            : e?.message === 'INVALID_CREATE_RESPONSE'
            ? 'Resposta inválida ao criar transcrição'
            : e?.message === 'POLL_FAILED'
            ? 'Falha ao consultar transcrição'
            : e?.message === 'TIMEOUT'
            ? 'Tempo esgotado ao transcrever'
            : e?.message === 'TRANSCRIPTION_FAILED'
            ? 'Transcrição falhou'
            : 'Ocorreu um erro ao transcrever'
        setError(msg)
        showToast(msg)
      }
    } finally {
      setStreaming(false)
      setAbortController(null)
    }
  }

  async function handleTranscribe() {
    if (streaming) return
    setTranscribeUrl('')
    setTranscribeMode('url')
    setTranscribeFile(null)
    setTranscribeOpen(true)
  }

  const confirmTranscribe = async () => {
    if (transcribeMode === 'url') {
      const url = transcribeUrl.trim()
      if (!url || !/^https?:\/\/.+/.test(url)) {
        showToast('URL inválida')
        return
      }
      setTranscribeOpen(false)
      await startTranscription(url)
    } else {
      if (!transcribeFile) {
        showToast('Selecione um arquivo')
        return
      }
      setTranscribeOpen(false)
      await startTranscriptionFromFile(transcribeFile)
    }
  }

  const cancelTranscribe = () => {
    setTranscribeOpen(false)
    setTranscribeUrl('')
    setTranscribeFile(null)
  }
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming && !overLimit && input.trim()) {
        sendMessage(input)
      }
    }
  }

  // Placeholder mais humano + hint contextual
  const buildPlaceholder = () => {
    if (streaming) return 'Aguarde a resposta...'
    return 'Digite sua mensagem ou dúvida aqui...'
  }
  const buildContextHint = () => {
    const parts = [mode, objective, tone, formality].filter(Boolean)
    return `Mensagem (${parts.join(' • ')})`
  }

  const MAX_CHARS = 2000
  const charCount = input.length
  const nearLimit = charCount > MAX_CHARS * 0.9
  const overLimit = charCount > MAX_CHARS

  const DEBUG_UI = import.meta.env.VITE_DEBUG_UI === 'true'

  // Microinterações do CTA usam useHoverControls (GSAP) e respeitam prefers-reduced-motion

  return (
    <div className="bg-root min-h-screen text-primary grid place-items-center p-4">
      <div className="w-full max-w-3xl h-[min(90vh,720px)] bg-surface-1 rounded-2xl border border-border overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,.25)] grid grid-rows-[auto_auto_1fr]">
        <Header
          mode={mode}
          tone={tone}
          formality={formality}
          setMode={setMode}
          setTone={setTone}
          setFormality={setFormality}
          objective={objective}
          setObjective={setObjective}
        />

        <SecondaryBar
          onOpenTemplates={openTemplates}
          onExport={exportSession}
          onClear={clearConversation}
          onTranscribe={handleTranscribe}
          streaming={streaming}
        />

        <main role="main" className="grid h-full grid-rows-[1fr_auto]">
          <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-surface-2/70 bg-cover bg-center bg-no-repeat bg-blend-multiply ${
            (useChatStore((s) => s.density) === 'compact' && 'space-y-2') ||
            (useChatStore((s) => s.density) === 'spacious' && 'space-y-4') ||
            'space-y-3'
          }`} style={{ backgroundImage: 'url(/Wallpaper.png)' }}>
            {messages.length === 0 && (
              <div className="pt-1">
                <SuggestionsChips
                  suggestions={["Quem é você?"]}
                  onSuggest={(p) => {
                    if (!streaming) {
                      sendMessage(p)
                    }
                  }}
                  disabled={streaming}
                />
              </div>
            )}
            {messages.map((m, i) => {
              const prev = i > 0 ? messages[i - 1] : undefined
              const groupedWithPrev = !!prev && prev.role === m.role
              const showAvatar = m.role === 'assistant' && !groupedWithPrev
              return (
                <ChatMessage
                  key={i}
                  message={m}
                  isLast={i === messages.length - 1}
                  streaming={streaming}
                  onCopy={copyMessage}
                  onFeedback={(r: 'up' | 'down') => postFeedback(r)}
                  onRegenerate={regenerate}
                  onSuggest={handleSuggest}
                  groupedWithPrev={groupedWithPrev}
                  showAvatar={showAvatar}
                />
              )
            })}
            <div ref={endRef} />
          </div>

          <form
            className="border-t border-border bg-surface-1 p-3"
            onSubmit={onSubmit}
          >
            <div className="relative flex items-end gap-2 rounded-xl border border-border bg-surface-2 focus-within:ring-2 ring-gold p-2">
              <label htmlFor="composer-input" className="sr-only">Mensagem</label>
              <textarea
                ref={inputRef}
                id="composer-input"
                className="flex-1 resize-none bg-transparent outline-none border-0 text-sm text-primary placeholder-muted max-h-36 p-2"
                placeholder={buildPlaceholder()}
                title={buildContextHint()}
                aria-describedby={
                  streaming || overLimit
                    ? [streaming ? 'composer-status' : null, overLimit ? 'composer-error' : null]
                        .filter(Boolean)
                        .join(' ')
                    : undefined
                }
                aria-invalid={overLimit ? true : undefined}
                maxLength={MAX_CHARS}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
              />

              <div className="flex items-center gap-2 pb-1">
                <span className="text-secondary text-xs hidden sm:inline">Não insira PII/segredos.</span>
                <button
                  type="button"
                  onClick={() => setAttachOpen(true)}
                  className="border-border bg-surface-3 hover:bg-surface-2 ring-gold rounded-md border px-2 py-1 text-[11px] focus:outline-none focus-visible:ring-2"
                  aria-haspopup="dialog"
                  {...bind}
                >
                  Anexar
                </button>
                {attachments.length > 0 && (
                  <span className="text-secondary text-[11px]" aria-live="polite">
                    {attachments.length} anexo{attachments.length>1?'s':''}
                  </span>
                )}

                <div className="flex-1" />

                <span
                  id="composer-status"
                  role="status"
                  aria-live="polite"
                  className={`inline-flex items-center gap-1 text-[11px] ${streaming ? 'text-gold' : 'text-secondary'}`}
                >
                  {streaming ? (
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="inline-block h-3 w-3 rounded-full border-2 border-black/40 border-t-black animate-spin motion-reduce:animate-none"></span>
                      <span>Gerando...</span>
                    </span>
                  ) : (
                    'Enviar'
                  )}
                </span>
                <InteractiveHoverButton
                  type="submit"
                  aria-label={streaming ? 'Gerando' : 'Enviar'}
                  aria-disabled={streaming || overLimit || !input.trim() ? true : undefined}
                  tabIndex={0}
                  onClick={(e) => {
                    if (streaming || overLimit || !input.trim()) {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  title="Enviar (Enter) / Nova linha (Shift+Enter)"
                >
                  {streaming ? (
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="inline-block h-3 w-3 rounded-full border-2 border-black/40 border-t-black animate-spin motion-reduce:animate-none"></span>
                      <span>Gerando...</span>
                    </span>
                  ) : (
                    'Enviar'
                  )}
                </InteractiveHoverButton>
                {streaming && (
                  <button
                    type="button"
                    onClick={cancelStreaming}
                    className="border-danger bg-danger hover:bg-danger/90 ring-gold rounded-md border px-3 py-2 text-white focus:outline-none focus-visible:ring-2 will-change-transform"
                    {...bind}
                  >
                    Parar
                  </button>
                )}
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="mt-2">
                <ul className="flex flex-wrap gap-2">
                  {attachments.map((a, i) => (
                    <li key={i} className="border-border bg-surface-2 rounded-md border px-2 py-1 text-[11px] inline-flex items-center gap-2">
                      <span className="sr-only">Anexo {i+1}:</span>
                      <span aria-hidden>{a.kind === 'image' ? '🖼️' : '📝'}</span>
                      <span>{a.name || (a.kind === 'image' ? 'imagem' : 'texto')}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="hover:text-primary ring-gold rounded-sm underline underline-offset-2 focus:outline-none focus-visible:ring-2"
                        aria-label={`Remover anexo ${i+1}`}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </main>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded-md bg-black/80 px-3 py-2 text-xs text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      <TemplatesDrawer
        open={templatesOpen}
        mode={mode}
        loading={loadingTemplates}
        templates={templates}
        onClose={closeTemplates}
        onInsert={insertTemplate}
      />

      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      <ConfirmDialog
        open={transcribeOpen}
        title="Transcrever por URL ou arquivo"
        description="Informe uma URL pública de áudio ou envie um arquivo (.mp4, .wav) para transcrever."
        confirmText="Transcrever"
        cancelText="Cancelar"
        onConfirm={confirmTranscribe}
        onCancel={cancelTranscribe}
      >
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 ${
              transcribeMode === 'url'
                ? 'border-gold bg-gold text-black ring-gold'
                : 'border-border bg-surface-3 hover:bg-surface-2 ring-gold text-primary'
            }`}
            onClick={() => setTranscribeMode('url')}
          >
            Por URL
          </button>
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 ${
              transcribeMode === 'file'
                ? 'border-gold bg-gold text-black ring-gold'
                : 'border-border bg-surface-3 hover:bg-surface-2 ring-gold text-primary'
            }`}
            onClick={() => setTranscribeMode('file')}
          >
            Arquivo
          </button>
        </div>
        {transcribeMode === 'url' ? (
          <div key="transcribe-url-mode">
            <label className="mb-2 block text-xs" htmlFor="transcribe-url">URL do áudio</label>
            <input
              key="transcribe-url-input"
              id="transcribe-url"
              autoFocus
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={transcribeUrl ?? ''}
              onChange={(e) => setTranscribeUrl(e.target.value)}
              className="border-border bg-surface-3 focus:bg-surface-2 ring-gold mb-4 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>
        ) : (
          <div key="transcribe-file-mode">
            <label className="mb-2 block text-xs" htmlFor="transcribe-file">Arquivo de áudio/vídeo</label>
            <input
              key="transcribe-file-input"
              id="transcribe-file"
              autoFocus
              type="file"
              accept="audio/*,video/mp4,video/mpeg,video/x-m4v"
              onChange={(e) => setTranscribeFile(e.target.files?.[0] || null)}
              className="border-border bg-surface-3 focus:bg-surface-2 ring-gold mb-4 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>
        )}
        </ConfirmDialog>

      {/* Dialogo de Anexos: adicionar texto/imagem */}
      <ConfirmDialog
        open={attachOpen}
        title="Adicionar anexo"
        description="Anexe uma imagem (até 4MB) ou um bloco de texto para enriquecer o contexto."
        confirmText="Adicionar"
        cancelText="Cancelar"
        onConfirm={async () => {
          await addAttachment()
        }}
        onCancel={() => {
          setAttachOpen(false)
        }}
      >
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 ${
              attachMode === 'image'
                ? 'border-gold bg-gold text-black ring-gold'
                : 'border-border bg-surface-3 hover:bg-surface-2 ring-gold text-primary'
            }`}
            onClick={() => setAttachMode('image')}
          >
            Imagem
          </button>
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 ${
              attachMode === 'text'
                ? 'border-gold bg-gold text-black ring-gold'
                : 'border-border bg-surface-3 hover:bg-surface-2 ring-gold text-primary'
            }`}
            onClick={() => setAttachMode('text')}
          >
            Texto
          </button>
        </div>
        {attachMode === 'text' ? (
          <div key="attach-text-mode">
            <label className="mb-2 block text-xs" htmlFor="attach-text">Texto do anexo</label>
            <textarea
              id="attach-text"
              value={attachText}
              onChange={(e) => setAttachText(e.target.value)}
              className="border-border bg-surface-3 focus:bg-surface-2 ring-gold mb-2 w-full min-h-24 rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
              placeholder="Cole aqui o texto contextual..."
            />
            <label className="mb-2 mt-2 block text-xs" htmlFor="attach-text-file">Ou selecione um arquivo de texto (até 1MB)</label>
            <input
              id="attach-text-file"
              type="file"
              accept=".txt,text/plain,.md,.csv,.json,.log,.yaml,.yml,.xml,.html,.htm,.js,.ts"
              onChange={(e) => handleAttachTextFileChange(e.target.files?.[0] || null)}
              className="border-border bg-surface-3 focus:bg-surface-2 ring-gold mb-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {attachTextName && (
              <p className="text-secondary text-xs" aria-live="polite">Arquivo selecionado: {attachTextName}</p>
            )}
          </div>
        ) : (
          <div key="attach-image-mode">
            <label className="mb-2 block text-xs" htmlFor="attach-file">Imagem (até 4MB)</label>
            <input
              id="attach-file"
              type="file"
              accept="image/*"
              onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
              className="border-border bg-surface-3 focus:bg-surface-2 ring-gold mb-4 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            <p className="text-secondary text-xs">Formatos comuns suportados (PNG, JPEG, WEBP). O conteúdo será enviado em data URL.</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Limpar conversa"
        description="Essa ação apagará a conversa atual. Deseja continuar?"
        confirmText="Limpar"
        cancelText="Cancelar"
        onConfirm={confirmClear}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}