/**
 * Sanitiza HTML potencialmente perigoso retornando somente texto plano.
 * - Remove TODAS as tags e atributos, retornando apenas o conteúdo textual
 * - Mantém o conteúdo textual interno de quaisquer tags (incluindo <script>)
 * - Decodifica entidades HTML ao utilizar textContent
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return ''
  // Usa um elemento <template> para parsear o HTML de forma segura sem inserir no DOM
  const tpl = document.createElement('template')
  tpl.innerHTML = dirty
  // textContent retorna apenas o texto, removendo as tags
  const text = tpl.content.textContent || ''
  // Normaliza quebras de linha opcionais e remove espaços supérfluos nas bordas
  return text
}

export default sanitizeHTML