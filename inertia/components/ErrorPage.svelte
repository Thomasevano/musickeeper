<script lang="ts">
  import Layout from '~/layouts/layout.svelte'

  let { title, heading, message }: { title: string; heading: string; message: string } = $props()
</script>

<Layout {title}>
  <div class="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
    <h1 class="text-4xl font-bold">{heading}</h1>
    <p class="mt-2 text-lg text-muted-foreground">{message}</p>
    <a href="/" class="mt-6 text-sm underline underline-offset-4 hover:text-foreground">
      Back to home
    </a>
  </div>
</Layout>
