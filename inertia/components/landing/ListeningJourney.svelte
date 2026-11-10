<script lang="ts">
  import { mode } from 'mode-watcher'

  // Hydrate the same image URLs as SSR; Svelte preserves mismatched initial src attributes.
  let mediaMode = $state('light')
  $effect(() => {
    mediaMode = mode.current === 'dark' ? 'dark' : 'light'
  })
</script>

<section id="how-it-works" tabindex="-1" class="py-12 xl:py-[72px]">
  <div class="mx-auto flex max-w-[1120px] flex-col gap-5 xl:grid xl:grid-cols-[372px_700px] xl:items-center xl:gap-12">
    <div class="flex flex-col gap-5">
      <h2 class="text-[32px] font-medium leading-[37px] tracking-[-0.8px] xl:text-[40px] xl:leading-[45px] xl:tracking-[-1.4px]">
        A link or a title.<br />That’s all you need.
      </h2>
      <p class="text-[16px] leading-[26px] text-muted-foreground xl:hidden">
        Choose Albums, search by title and artist, then tap the matching item. Mark it listened
        from the item menu when you’re done.
      </p>
      <p class="hidden text-[16px] leading-[26px] text-muted-foreground xl:block">
        Search for an album by title and artist, then click the matching item to add it.
        <br /><br />
        When you’ve listened, mark it from the item menu. Your links stay in the list.
      </p>
      <p class="hidden text-[14px] leading-[22px] text-muted-foreground xl:block">
        Have a music link instead?<br />Paste it to save a specific release.
      </p>
    </div>

    <div class="flex max-w-[342px] flex-col gap-[14px] xl:hidden">
      <p class="text-[12px] text-muted-foreground">To Pimp a Butterfly · Added from search</p>
      <img
        src="/landing/tpab-listened-{mediaMode}-mobile.png"
        alt="To Pimp a Butterfly in the list, marked listened, with platform links."
        width="716"
        height="386"
        loading="lazy"
        class="h-auto w-full rounded-[5px]"
      />
      <p class="text-[14px] leading-[22px] text-muted-foreground">
        Your platform links stay available after listening.
      </p>
    </div>

    <div class="hidden flex-col gap-4 xl:flex">
      <p class="text-[13px] text-muted-foreground dark:text-[#D3D4D7]">Added from search · Marked listened</p>
      <img
        src="/landing/tpab-listened-{mediaMode}-desktop.png"
        alt="To Pimp a Butterfly in the list, marked listened, with platform links."
        width="1936"
        height="242"
        loading="lazy"
        class="h-auto w-full rounded-lg"
      />
    </div>
  </div>
</section>
