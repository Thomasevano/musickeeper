<script>
	import '../app.pcss';
	import { ModeWatcher } from 'mode-watcher';
	import Footer from '$lib/components/Footer.svelte';
</script>

<slot />
<ModeWatcher />
<Footer />
