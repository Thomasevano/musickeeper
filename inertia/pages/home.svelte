<script>
  import HeroSection from '$components/landing/HeroSection.svelte'
  import Features from '$components/landing/Features.svelte'
  import Navigation from '$components/Navigation.svelte'
  import Layout from '~/layouts/layout.svelte'

  export let title
  export let description
</script>

<Layout {title} {description}>
  <Navigation />
  <HeroSection />
  <Features />
</Layout>
