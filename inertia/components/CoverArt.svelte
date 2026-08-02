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

  let {
    src,
    alt,
    size = 'md',
    class: className,
    ...restProps
  }: CoverArtProps = $props()

  // Derived archive URLs can legitimately 404. In that case, finish loading
  // with the placeholder instead of leaving the skeleton on screen.
  const PLACEHOLDER = '/blank-album.svg'

  const INITIAL_LOAD_STATE = { failed: false, settled: false }
  let imageLoadState = $state({ key: '', ...INITIAL_LOAD_STATE })

  const currentSourceLoadState = $derived(
    imageLoadState.key === (src ?? '')
      ? imageLoadState
      : { key: src ?? '', ...INITIAL_LOAD_STATE }
  )
  const resolvedSrc = $derived(
    currentSourceLoadState.failed ? PLACEHOLDER : (src ?? PLACEHOLDER)
  )
  const isLoading = $derived(!currentSourceLoadState.settled)

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-32 w-32',
    lg: 'h-48 w-48',
  }

  const sizeClass = $derived(sizeClasses[size])

  function handleLoad() {
    imageLoadState = { ...currentSourceLoadState, settled: true }
  }

  function handleError() {
    imageLoadState = { ...currentSourceLoadState, failed: true, settled: true }
  }
</script>

<div class={cn(sizeClass, className)} {...restProps}>
  {#key src}
    {#if isLoading}
      <Skeleton class={cn(sizeClass)} />
    {/if}
    <img
      src={resolvedSrc}
      {alt}
      class={cn(
        'object-cover rounded-md transition-opacity duration-150',
        sizeClass,
        isLoading ? 'opacity-0' : 'opacity-100'
      )}
      onload={handleLoad}
      onerror={handleError}
    />
  {/key}
</div>
