<script>
  import ToggleTheme from './ToggleTheme.svelte'
  import { Button } from '$lib/components/ui/button'
</script>

<section class="border-b">
  <div class="mx-auto w-full max-w-7xl px-8 md:px-12 lg:px-16">
    <div
      class="mx-auto flex w-full flex-col py-5 md:flex-row md:items-center md:justify-between md:px-6"
    >
      <div class="flex flex-row content-between items-center justify-between lg:justify-start">
        <a href="/" class="inline-flex items-center gap-3">
          <span class="font-display font-bold">MusicKeeper</span>
        </a>
        <button
          class="inline-flex items-center justify-center p-2 text-gray-400 hover:text-black focus:text-black focus:outline-hidden md:hidden lg:hidden"
          aria-label="Toggle theme"
        >
          <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path
              class="inline-flex"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
            <path
              class="hidden"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
      <nav class="hidden grow flex-col md:flex md:flex-row md:justify-center md:pb-0">
        <div class="md:ml-auto md:justify-between">
          <Button href="/#features" variant="link">Features</Button>
          <Button href="https://thomasevano.fr/en/tags/musickeeper/" variant="link">Blog</Button>
        </div>
        <div class="flex md:ml-auto">
          <ToggleTheme />
        </div>
      </nav>
    </div>
  </div>
</section>
