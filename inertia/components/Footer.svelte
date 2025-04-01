<script>
  import { page } from '@inertiajs/svelte'
  const { appName } = $page.props
</script>

<footer>
  <span class="block text-sm text-muted-foreground sm:text-center">
    {appName} v{__APP_VERSION__} Copyright &copy {new Date().getFullYear()}{' '}
    With ❤️ by
    <a target="_blank" href="https://thomasevano.fr/" class="hover:underline"> Evano Thomas </a>
    . All Rights Reserved.
  </span>
</footer>
