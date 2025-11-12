<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import Layout from '~/layouts/layout.svelte'
</script>

<Layout title="Access Restricted" description="Request access to MusicKeeper">
  <section class="space-y-6 pb-12 pt-16 lg:py-28">
    <div class="container flex max-w-[64rem] flex-col items-center gap-5 text-center">
      <div class="bg-muted flex h-20 w-20 items-center justify-center rounded-full text-4xl">
        <i class="si si-spotify si--color"></i>
      </div>

      <h1
        class="font-heading text-balance text-4xl font-bold leading-[1.1]! sm:text-5xl md:text-6xl"
      >
        Access Restricted
      </h1>

      <p
        class="text-muted-foreground max-w-[42rem] text-balance leading-normal sm:text-xl sm:leading-8"
      >
        You're not currently in the list of allowed users for this Spotify application. This is a
        limitation during the app's development phase.
      </p>

      <div class="bg-muted mt-8 w-full max-w-md rounded-lg border p-6">
        <div class="space-y-4 text-center">
          <p class="text-muted-foreground leading-relaxed">
            Contact the developer if you want to participate in the development.
          </p>
        </div>
      </div>

      <div class="mt-6">
        <Button variant="ghost" href="/">
          <span aria-hidden="true">&larr;</span>
          Back to Home
        </Button>
      </div>
    </div>
  </section>
</Layout>
