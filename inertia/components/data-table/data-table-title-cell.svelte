<script lang="ts">
  let { title, albumName }: { title: string; albumName: string | null } = $props()
</script>

<div class="flex min-w-0 flex-col">
  <span class="font-medium [overflow-wrap:anywhere]">{title}</span>
  {#if albumName}
    <span class="text-muted-foreground text-xs [overflow-wrap:anywhere]">{albumName}</span>
  {/if}
</div>
