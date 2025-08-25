import { useEffect, useState } from 'react'

/**
 * Hook acessível para detectar se o usuário prefere reduzir movimento.
 * Retorna true quando é seguro animar (prefers-reduced-motion: no-preference).
 */
export function useMotionSafe(): boolean {
  const [motionSafe, setMotionSafe] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => setMotionSafe(!mql.matches)
    update()

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', update)
      return () => mql.removeEventListener('change', update)
    }
    // Fallback Safari
    // @ts-ignore
    mql.addListener(update)
    return () => {
      // @ts-ignore
      mql.removeListener(update)
    }
  }, [])

  return motionSafe
}