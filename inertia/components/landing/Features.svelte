<script lang="ts">
  import { ListEnd, ArrowRight, FolderKanban, Download } from '@lucide/svelte'
  import type { LandingFeature } from '~/lib/types'
  import FeatureCard from './FeatureCard.svelte'

  const features: Array<LandingFeature> = [
    {
      icon: ListEnd,
      title: 'Listen later list',
      description: 'Keep track of songs you want to listen to later',
      isAvailable: true,
    },
    {
      icon: ArrowRight,
      title: 'Transfer',
      description: 'Transfer your music library from one streaming service to another',
      isAvailable: false,
    },
    {
      icon: FolderKanban,
      title: 'Manage',
      description: 'Centralize all your music library from streaming services all in one place',
      isAvailable: false,
    },
    {
      icon: 'connect',
      title: 'Connect',
      description: 'Connect to all streaming services',
      isAvailable: false,
    },
    {
      icon: Download,
      title: 'Own',
      description: 'Allows you to legally buy albums and playlists in one click',
      isAvailable: false,
    },
  ]
</script>

<section
  id="features"
  class="container space-y-6 py-8 md:py-12 lg:pt-0 lg:py-24 dark:bg-transparent"
>
  <div class="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
    <h2 class="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
    <p
      class="balance-text text-muted-foreground max-w-[85%] leading-normal sm:text-lg sm:leading-7"
    >
      The philosophy of this project started from a desire to have more control and freedom on my
      music and be less dependant of music streaming service. So if tomorrow the one you use doesn't
      exist anymore, you are able keep the content of playlists, saved albums and artists. It also
      aim to help you switch from music streaming service and be able to legally buy your favorite
      music in one click.
    </p>
  </div>
  <div class="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
    {#each features as feature (feature.icon)}
      <FeatureCard {feature} />
    {/each}
  </div>
</section>
