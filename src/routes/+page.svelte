<script lang="ts">
	import HeroSection from '$lib/components/landing/HeroSection.svelte';
	import Features from '$lib/components/landing/Features.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import type { LayoutData } from './$types';
	export let data: LayoutData;
</script>

<Navigation user={data} />
<HeroSection />
<Features />
