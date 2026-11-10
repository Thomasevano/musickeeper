<script lang="ts">
  import WifiOff from '@lucide/svelte/icons/wifi-off'
  import Download from '@lucide/svelte/icons/download'

  const planned = [
    { title: 'Buy music', description: 'Find ways to buy the music you want to keep.' },
    {
      title: 'Sync across devices',
      description: 'Keep your Listen Later List with you across devices.',
    },
    { title: 'Share your list', description: 'Pass your music recommendations on to friends.' },
  ]
</script>

<section
  aria-labelledby="local-first-heading"
  class="flex flex-col gap-6 border-y py-10 xl:min-h-[206px] xl:flex-row xl:items-center xl:justify-between"
>
  <div class="space-y-5 xl:max-w-[640px]">
    <h2 id="local-first-heading" class="text-[28px] font-medium tracking-[-0.7px] xl:text-[32px]">
      Your music. Your device.
    </h2>
    <p class="text-muted-foreground text-base leading-[1.6]">
      No account to create. No public profile to keep up.<br class="hidden xl:block" />
      Your Listen Later List is stored in your browser.
    </p>
  </div>
  <ul class="flex flex-col gap-5 xl:w-[340px] xl:shrink-0">
    <li class="flex items-start gap-3">
      <WifiOff class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <h3 class="text-sm font-medium">Ready when you’re offline</h3>
        <p class="text-muted-foreground mt-1 text-[13px] leading-normal">
          Your saved list, without a connection.
        </p>
      </div>
    </li>
    <li class="flex items-start gap-3">
      <Download class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <h3 class="text-sm font-medium">A home on your device</h3>
        <p class="text-muted-foreground mt-1 text-[13px] leading-normal">
          Install MusicKeeper from your browser.
        </p>
      </div>
    </li>
  </ul>
</section>

<section aria-labelledby="roadmap-heading" class="pt-12 xl:pt-16">
  <h2 id="roadmap-heading" class="text-[28px] font-medium tracking-[-0.7px] xl:text-[32px]">
    What’s next
  </h2>
  <p class="text-muted-foreground mt-3 text-sm leading-[1.6]">
    Planned, not available yet. No release dates announced.
  </p>
  <ul class="mt-6">
    {#each planned as feature (feature.title)}
      <li class="border-b py-6 xl:grid xl:grid-cols-[310px_1fr] xl:items-center xl:gap-6">
        <div class="flex items-center justify-between gap-4 xl:justify-start xl:gap-3">
          <h3 class="font-medium">{feature.title}</h3>
          <span class="text-muted-foreground rounded border border-[#45474e] px-1.5 py-0.5 text-[11px] leading-none">
            Planned
          </span>
        </div>
        <p class="text-muted-foreground mt-2 text-sm leading-[1.6] xl:mt-0">{feature.description}</p>
      </li>
    {/each}
  </ul>
</section>
