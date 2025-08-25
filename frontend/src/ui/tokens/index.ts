// Tokens JS de apoio (espelho dos CSS Custom Properties),
// úteis para componentes JS/TS e microinterações.
export const motion = {
  duration: { fast: 0.2, normal: 0.3, slow: 0.5 },
  ease: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.32, 0, 0, 1)',
  },
}

export const colors = {
  backgroundRoot: 'var(--color-bg-root)',
  surface1: 'var(--color-bg-1)',
  surface2: 'var(--color-bg-2)',
  surface3: 'var(--color-bg-3)',
  border: 'var(--color-border)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  textSubtle: 'var(--color-text-subtle)',
  accentGold: 'var(--color-accent-gold)',
}