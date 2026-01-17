<script>
  import { page } from '@inertiajs/svelte'
  const { appName, appVersion } = $page.props
</script>

<footer>
  <span class="m-8 block text-sm text-muted-foreground sm:text-center">
    {appName} v{appVersion} Copyright &copy {new Date().getFullYear()}{' '}
    With ❤️ by
    <a target="_blank" href="https://thomasevano.fr/" class="hover:underline"> Evano Thomas </a>
    . All Rights Reserved.
  </span>
</footer>
