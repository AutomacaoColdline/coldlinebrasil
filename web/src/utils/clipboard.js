export async function copyTextToClipboard(text) {
  const value = String(text ?? '')
  if (!value) return false

  // Prefer API moderna quando disponível (contexto seguro).
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch (_) {
      // fallback abaixo
    }
  }

  // Fallback para HTTP/incompatibilidade.
  const ta = document.createElement('textarea')
  ta.value = value
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  ta.style.pointerEvents = 'none'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, ta.value.length)
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  return ok
}
