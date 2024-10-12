<script lang="ts">
	import HeroSection from '$components/landing/HeroSection.svelte';
	import Features from '$components/landing/Features.svelte';
	import Navigation from '$components/Navigation.svelte';
	import type { LayoutData } from './$types';
	export let data: LayoutData;
	$: ({ user, isLoggedIn } = data);
</script>

<Navigation {user} {isLoggedIn} />
<HeroSection {isLoggedIn} />
<Features />
