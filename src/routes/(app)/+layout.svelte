<script lang="ts">
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';

	export let data: LayoutData;
</script>

{#if data}
	<div class="hidden md:block">
		<!-- <Menu /> -->
		<div class="border-t">
			<div class="bg-background">
				<div class="grid lg:grid-cols-5">
					<Sidebar class="hidden lg:block" />
					<h1>You are connected with your Spotify Account: {data.user.display_name}</h1>
					<slot />
				</div>
			</div>
		</div>
	</div>
{/if}
