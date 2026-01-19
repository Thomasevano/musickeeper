<script lang="ts">
  import { CloudOff, FolderSync, Download, ListEnd, Share2 } from '@lucide/svelte'
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
      icon: CloudOff,
      title: 'Offline First',
      description: 'Everything is store locally in your browser',
      isAvailable: true,
    },
    {
      icon: Download,
      title: 'Own',
      description: 'Allows you to legally buy albums and playlists in one click',
      isAvailable: false,
    },
    {
      icon: FolderSync,
      title: 'Sync',
      description: 'Synchronize your list to multiple devices',
      isAvailable: false,
    },
    {
      icon: Share2,
      title: 'Community',
      description: 'Share your list with your friends',
      isAvailable: false,
    },
  ]
</script>

<section
  id="features"
  class="container space-y-6 py-8 md:py-12 lg:pt-0 lg:py-12 dark:bg-transparent"
>
  <div class="mx-auto flex max-w-232 flex-col items-center space-y-4 text-center">
    <h2 class="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
  </div>
  <div class="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
    {#each features as feature (feature.icon)}
      <FeatureCard {feature} />
    {/each}
  </div>
</section>
