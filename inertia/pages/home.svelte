<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import { Button } from '$lib/components/ui/button'
  import HeroSection from '$components/landing/HeroSection.svelte'
  import Features from '$components/landing/Features.svelte'
  import ProductPreview from '$components/landing/ProductPreview.svelte'
  import ListeningJourney from '$components/landing/ListeningJourney.svelte'
  import { ModeWatcher } from 'mode-watcher'
  import ToggleTheme from '$components/ToggleTheme.svelte'

  const blogUrl = 'https://thomasevano.fr/en/tags/musickeeper/'
</script>

{#snippet brand()}
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">
    <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    <g transform="translate(7.4, 5.2) scale(0.4)" stroke-width="3.5">
      <circle cx="8" cy="18" r="3"/>
      <path d="M12 18V2l7 4"/>
    </g>
  </svg>
  <span class="font-[LandingInter] text-base font-bold">MusicKeeper</span>
{/snippet}

<ModeWatcher themeColors={{ light: '#ffffff', dark: '#0d0e10' }} />

<div
  class="landing min-h-dvh bg-background text-foreground antialiased pt-[env(safe-area-inset-top)] pe-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] ps-[env(safe-area-inset-left)]"
>
  <a
    href="#main-content"
    class="sr-only z-10 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
  >
    Skip to content
  </a>
  <header class="border-b">
    <nav
      aria-label="Main navigation"
      class="mx-auto flex h-[76px] max-w-[1168px] items-center justify-between gap-2 px-6 xl:h-[88px]"
    >
      <a href="/" aria-label="MusicKeeper home" class="flex min-h-11 shrink-0 items-center gap-2">
        {@render brand()}
      </a>
      <div class="flex items-center gap-2 xl:gap-6">
        <a href="#how-it-works" class="hidden min-h-11 items-center text-sm xl:inline-flex">
          How it works
        </a>
        <a
          href={blogUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="hidden min-h-11 items-center text-sm xl:inline-flex"
        >
          Blog<span class="sr-only"> (opens in new tab)</span>
        </a>
        <Button
          href="/library/listen-later"
          variant="ghost"
          class="h-11 min-h-11 gap-3 px-0 text-[13px] xl:bg-secondary xl:px-4"
        >
          <span class="xl:hidden">Open app</span>
          <span class="hidden xl:inline">Open MusicKeeper</span>
          <ArrowRight aria-hidden="true" />
        </Button>
        <ToggleTheme />
      </div>
    </nav>
  </header>

  <main id="main-content" tabindex="-1" class="mx-auto max-w-[1168px] px-6">
    <HeroSection />
    <ProductPreview />
    <ListeningJourney />
    <Features />
    <section
      aria-labelledby="closing-heading"
      class="flex flex-col items-start gap-6 py-14 xl:flex-row xl:items-center xl:justify-between xl:gap-20 xl:py-[88px]"
    >
      <div>
        <h2
          id="closing-heading"
          class="text-[32px] leading-[1.15] font-medium tracking-[-0.8px] xl:text-[40px] xl:tracking-[-1.3px]"
        >
          Make room for your next favorite.
        </h2>
        <p class="text-muted-foreground mt-4 hidden text-base xl:block">
          Start with the one you’ve been meaning to hear.
        </p>
      </div>
      <Button href="/library/listen-later" class="h-[46px] shrink-0 gap-6 rounded-[7px] px-5 md:h-[46px]">
        Start your list <ArrowRight aria-hidden="true" />
      </Button>
    </section>
  </main>

  <footer class="border-t">
    <div class="mx-auto flex max-w-[1168px] flex-col gap-5 px-6 py-7 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-6">
        <a href="/" aria-label="MusicKeeper home" class="flex min-h-11 items-center gap-2">
          {@render brand()}
        </a>
        <p class="text-muted-foreground text-xs">An independent project by Thomas Evano.</p>
      </div>
      <div class="text-muted-foreground flex items-center gap-6 text-xs">
        <a
          href="https://github.com/Thomasevano/musickeeper"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center"
        >
          GitHub<span class="sr-only"> (opens in new tab)</span>
        </a>
        <a href={blogUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center">
          Blog<span class="sr-only"> (opens in new tab)</span>
        </a>
        <span>v{page.props.appVersion}</span>
      </div>
    </div>
  </footer>
</div>

<style>
  @font-face {
    font-family: 'LandingGeist';
    font-style: normal;
    font-weight: 400 700;
    font-display: swap;
    src: url('/landing/fonts/font-05.woff2') format('woff2');
  }

  @font-face {
    font-family: 'LandingInter';
    font-style: normal;
    font-weight: 400 700;
    font-display: swap;
    src: url('/landing/fonts/font-12.woff2') format('woff2');
  }

  .landing {
    font-family: 'LandingGeist', system-ui, sans-serif;
  }

  :global(.dark) .landing {
    --background: 220 10.3% 5.7%;
    --foreground: 240 3.4% 94.3%;
    --muted-foreground: 225 4.7% 66.7%;
    --primary: 240 3.4% 94.3%;
    --primary-foreground: 220 10.3% 5.7%;
    --secondary: 223 9.1% 15.1%;
    --secondary-foreground: 240 3.4% 94.3%;
    --border: 220 7.7% 15.3%;
    --ring: 240 3.4% 94.3%;
  }

  .landing :global(a:focus-visible) {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 4px;
  }

  @media (hover: hover) {
    .landing :global(a:not([class*='bg-primary']):hover) {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  }
</style>
