import { cubicOut } from 'svelte/easing'
import { fly, type TransitionConfig } from 'svelte/transition'

/** Keep table row feedback on compositor-friendly properties. */
export function rowIn(node: Element): TransitionConfig {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { duration: 0 }
  return fly(node, { y: -6, opacity: 0, duration: 180, easing: cubicOut })
}

export function rowOut(_node: Element): TransitionConfig {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { duration: 0 }
  return {
    duration: 160,
    easing: cubicOut,
    css: (t) => `opacity: ${t}; transform: translateX(${(1 - t) * 14}px);`,
  }
}
