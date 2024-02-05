<script lang="ts">
  import type { LayoutData } from './$types';
	
	export let data: LayoutData;
</script>

{#if data}
  <p>Spotify email: {data.user.email}</p>
{/if}
<slot />