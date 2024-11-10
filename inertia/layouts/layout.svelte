<script>
  import '../css/app.css'
  import { ModeWatcher } from 'mode-watcher'
  import Footer from '$components/Footer.svelte'
  export let title
  export let description
</script>

<svelte:head>
  <title>{{ title }}</title>
  <meta name="description" content={{ description }} />
</svelte:head>

<slot />
<ModeWatcher />
<Footer />
