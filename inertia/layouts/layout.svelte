<script>
  import { ModeWatcher } from 'mode-watcher'
  import Footer from '$components/Footer.svelte'
  let { children } = $props()
</script>

{@render children()}
<ModeWatcher />
<Footer />
