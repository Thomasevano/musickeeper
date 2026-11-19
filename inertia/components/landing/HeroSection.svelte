<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import { Button } from '$lib/components/ui/button'
</script>

<section class="flex flex-col gap-[18px] pt-8 pb-7 xl:pt-12 xl:pb-8">
  <h1
    class="text-[40px] leading-[1.08] font-medium tracking-[-1.2px] xl:text-[64px] xl:leading-[1.06] xl:tracking-[-2.2px]"
  >
    Good music<br class="xl:hidden" />{' '}finds you.<br />
    Keep it for later.
  </h1>
  <p class="text-muted-foreground text-base leading-[1.6] xl:text-[17px] xl:leading-normal">
    <span class="xl:hidden">
      Save a track or album. Find it in your list when you’re ready to listen.
    </span>
    <span class="hidden xl:inline">
      Save the tracks and albums you mean to listen to.<br />
      Paste a link or search, then come back when you’re ready.
    </span>
  </p>
  <div class="flex flex-col items-start gap-[18px] xl:flex-row xl:items-center">
    <Button href="/library/listen-later" class="h-[46px] gap-6 rounded-[7px] px-5 md:h-[46px]">
      Start your list <ArrowRight aria-hidden="true" />
    </Button>
    <p class="text-muted-foreground text-[13px] leading-[18px]">No account. Just your music.</p>
  </div>
</section>
