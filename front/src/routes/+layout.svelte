<script lang="ts">
	import '../app.pcss';
	import { ModeWatcher } from 'mode-watcher';
	import Footer from '../components/Footer.svelte';
	import type { PageData } from './$types';
	import { QueryClientProvider } from '@tanstack/svelte-query';

	export let data: PageData;
</script>

<QueryClientProvider client={data.queryClient}>
	<slot />
	<ModeWatcher />
	<Footer />
</QueryClientProvider>
