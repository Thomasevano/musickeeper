import { cubicOut } from 'svelte/easing'
import { fade, fly, type TransitionConfig } from 'svelte/transition'

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Keep table row feedback on compositor-friendly properties.
 *
 * Under `reduce` the row still fades: a row that blinks in or out with no
 * transition at all is harder to follow than one that moves, which is the
 * opposite of what the preference asks for. Only the travel is removed.
 */
export function rowIn(node: Element): TransitionConfig {
  if (prefersReducedMotion()) return fade(node, { duration: 180, easing: cubicOut })
  return fly(node, { y: -6, opacity: 0, duration: 180, easing: cubicOut })
}

export function rowOut(node: Element): TransitionConfig {
  if (prefersReducedMotion()) return fade(node, { duration: 160, easing: cubicOut })
  return {
    duration: 160,
    easing: cubicOut,
    css: (t) => `opacity: ${t}; transform: translateX(${(1 - t) * 14}px);`,
  }
}
