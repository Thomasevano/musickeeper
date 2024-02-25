<script lang="ts">
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	export let data: LayoutData;
</script>

<Navigation user={data} />
{#if data}
	<div class="hidden md:block">
		<!-- <Menu /> -->
		<div class="border-t">
			<div class="bg-background">
				<div class="grid lg:grid-cols-5">
					<Sidebar class="hidden md:block" />
					<slot />
				</div>
			</div>
		</div>
	</div>
{/if}
