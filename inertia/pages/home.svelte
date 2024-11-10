<script>
  import HeroSection from '$components/landing/HeroSection.svelte'
  import Features from '$components/landing/Features.svelte'
  import Navigation from '$components/Navigation.svelte'
  import Layout from '~/layouts/layout.svelte'

  let { title, description } = $props()
</script>

<Layout {title} {description}>
  <Navigation />
  <HeroSection />
  <Features />
</Layout>
