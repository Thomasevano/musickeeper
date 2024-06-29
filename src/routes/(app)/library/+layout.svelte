<script lang="ts">
	import type { LayoutData } from './$types';
	import Navigation from '$lib/components/Navigation.svelte';
	export let data: LayoutData;
	$: ({ user, isLoggedIn } = data);
</script>

<svelte:head>
	<title>Library - MusicKeeper</title>
</svelte:head>

<Navigation {user} {isLoggedIn} />
{#if data}
	<div>
		<div class="border-t">
			<div class="bg-background">
				<div class="grid">
					<slot />
				</div>
			</div>
		</div>
	</div>
{/if}
