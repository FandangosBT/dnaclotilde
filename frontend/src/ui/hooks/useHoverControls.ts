import { gsap } from 'gsap'
import type React from 'react'
import { useMotionSafe } from './useMotionSafe'

type Options = {
  hoverScale?: number
  pressScale?: number
  hoverDuration?: number
  pressDuration?: number
  ease?: string
}

/**
 * Hook para hover/press com GSAP, respeitando prefers-reduced-motion
 * e com API simples para reutilização nas UI controls.
 */
export function useHoverControls(options: Options = {}) {
  const motionSafe = useMotionSafe()

  const hoverScale = options.hoverScale ?? 1.04
  const pressScale = options.pressScale ?? 0.97
  const hoverDuration = options.hoverDuration ?? 0.3
  const pressDuration = options.pressDuration ?? 0.2
  const ease = options.ease ?? 'power2.out'

  const hoverIn = (el: HTMLElement | null) => {
    if (!el || !motionSafe) return
    gsap.to(el, { scale: hoverScale, duration: hoverDuration, ease })
  }
  const hoverOut = (el: HTMLElement | null) => {
    if (!el) return
    gsap.to(el, { scale: 1, duration: hoverDuration, ease })
  }
  const pressIn = (el: HTMLElement | null) => {
    if (!el || !motionSafe) return
    gsap.to(el, { scale: pressScale, duration: pressDuration, ease })
  }
  const pressOut = (el: HTMLElement | null) => {
    if (!el) return
    gsap.to(el, { scale: 1, duration: pressDuration, ease })
  }

  const bind = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => hoverIn(e.currentTarget as HTMLElement),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => hoverOut(e.currentTarget as HTMLElement),
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => pressIn(e.currentTarget as HTMLElement),
    onMouseUp: (e: React.MouseEvent<HTMLElement>) => pressOut(e.currentTarget as HTMLElement),
  }

  return { hoverIn, hoverOut, pressIn, pressOut, bind }
}