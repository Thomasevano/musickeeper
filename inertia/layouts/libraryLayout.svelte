<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ListenLaterItem } from '../../src/domain/music_item'
  import Layout from '~/layouts/layout.svelte'

  let {
    children,
    data,
    title,
  }: { children: Snippet; data: ListenLaterItem[]; title?: string } = $props()
</script>

<Layout {title}>
  {#if data}
    {@render children()}
  {/if}
</Layout>
