<script>
  import { page } from '@inertiajs/svelte'
  import { cn } from '$lib/utils'
  import { buttonVariants, Button } from '$lib/components/ui/button'

  const { appVersion } = $page.props
</script>

<section class="space-y-6 pb-6 pt-16 lg:py-28">
  <div class="container flex max-w-5xl flex-col items-center gap-5 text-center">
    <a
      href={`https://github.com/Thomasevano/musickeeper/releases/tag/v${appVersion}`}
      class={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      target="_blank"
      rel="noopener noreferrer"
    >
      v{appVersion} &mdash; See what's new 🎉
      <span aria-hidden="true">&rarr;</span>
      <span class="sr-only">(opens in new tab)</span>
    </a>

    <h1
      class="font-heading text-balance text-4xl font-bold leading-tight sm:text-5xl md:text-6xl lg:text-7xl"
    >
      Keep track of music recommendations
    </h1>

    <p class="text-muted-foreground max-w-2xl text-pretty leading-normal sm:text-xl sm:leading-8">
      A simple app to keep track on music you want or have been recommanded to listen to.
    </p>
    <div class="flex justify-center space-x-2 md:space-x-4">
      <Button size="lg" href="/library/listen-later">
        Get Started
        <span class="ml-1" aria-hidden="true">&rarr;</span>
      </Button>
    </div>
  </div>
</section>
