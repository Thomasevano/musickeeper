<script lang="ts">
	import '../app.pcss';
	import { ModeWatcher } from 'mode-watcher';
	import Footer from '$lib/components/Footer.svelte';
	import Navigation from '$lib/components/landing/Navigation.svelte';
</script>

<Navigation />
<slot />
<ModeWatcher />
<Footer />
