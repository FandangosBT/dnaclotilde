import '@testing-library/jest-dom'

// Polyfill scrollIntoView para JSDOM
if (!HTMLElement.prototype.scrollIntoView) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  HTMLElement.prototype.scrollIntoView = function () {}
}

// Polyfill matchMedia para testes com prefers-reduced-motion
if (!window.matchMedia) {
  // @ts-ignore
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

// Polyfill básico de clipboard
try {
  if (!('clipboard' in navigator)) {
    // @ts-ignore
    navigator.clipboard = { writeText: async () => {} }
  }
} catch {}
