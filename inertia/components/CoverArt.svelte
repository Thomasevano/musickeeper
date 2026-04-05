<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils.js'
  import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte'

  interface CoverArtProps extends HTMLAttributes<HTMLDivElement> {
    src: string | undefined
    alt: string
    size?: 'sm' | 'md' | 'lg'
    class?: string
  }

  let { src, alt, size = 'md', class: className, ...restProps }: CoverArtProps = $props()

  let isLoading = $state(true)

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-32 w-32',
    lg: 'h-48 w-48',
  }

  const sizeClass = $derived(sizeClasses[size])

  function handleLoad() {
    isLoading = false
  }
</script>

<div class={cn(sizeClass, className)} {...restProps}>
  {#key src}
    {#if isLoading}
      <Skeleton class={cn(sizeClass)} />
    {/if}
    <img
      {src}
      {alt}
      class={cn(
        'object-cover rounded-md transition-opacity duration-150',
        sizeClass,
        isLoading ? 'opacity-0' : 'opacity-100'
      )}
      onload={handleLoad}
    />
  {/key}
</div>
