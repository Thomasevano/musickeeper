<script lang="ts">
  let { title, albumName }: { title: string; albumName: string | null } = $props()
</script>

<div class="flex flex-col">
  <span class="font-medium">{title}</span>
  {#if albumName}
    <span class="text-muted-foreground text-xs">{albumName}</span>
  {/if}
</div>
