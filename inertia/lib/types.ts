import { Component } from 'svelte'
import type { IconProps } from '@lucide/svelte'

export interface LandingFeature {
  icon: Component<IconProps, {}, ''> | string
  title: string
  description: string
  isAvailable: Boolean
}
