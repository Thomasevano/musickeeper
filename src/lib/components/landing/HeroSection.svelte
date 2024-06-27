<script lang="ts">
	import { cn } from '$lib/utils';
	import { buttonVariants, Button } from '$lib/components/ui/button';

	export let isLoggedIn: Boolean;
</script>

<section class="space-y-6 pb-12 pt-16 lg:py-28">
	<div class="container flex max-w-[64rem] flex-col items-center gap-5 text-center">
		<a
			href="https://github.com/Thomasevano/musickeeper"
			class={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
			target="_blank"
		>
			source code and releases on Github <i class="si si-github si--color ml-2 mr-2 text-2xl"></i>
			<span aria-hidden="true">&rarr;</span>
		</a>

		<h1
			class="font-heading text-balance text-4xl font-bold !leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl"
		>
			MusicKeeper
		</h1>

		<p
			class="text-muted-foreground max-w-[42rem] text-balance leading-normal sm:text-xl sm:leading-8"
		>
			A music manager app that help you manage, extract and transfer your music between different
			streaming platforms
		</p>
		<div class="flex justify-center space-x-2 md:space-x-4">
				{#if !isLoggedIn}
				<Button size="lg" href="/login/spotify">
					<i class="si si-spotify si--color mr-2 text-2xl"></i>
					Sign in with Spotify <span class="ml-1" aria-hidden="true">&rarr;</span>
				</Button>
				{:else}
				<Button size="lg" href="/library">
					See your library <span class="ml-1" aria-hidden="true">&rarr;</span>
				</Button>
				{/if}
			</div>
	</div>
</section>
