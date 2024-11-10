<script>
  import '../css/app.css'
  import { ModeWatcher } from 'mode-watcher'
  import Footer from '$components/Footer.svelte'
</script>

<slot />
<ModeWatcher />
<Footer />
