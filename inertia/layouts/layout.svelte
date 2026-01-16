<script>
  import { ModeWatcher } from 'mode-watcher'
  import Footer from '$components/Footer.svelte'
  import Navigation from '~/components/Navigation.svelte'
  let { children } = $props()
</script>

<Navigation />
{@render children()}
<ModeWatcher />
<Footer />
