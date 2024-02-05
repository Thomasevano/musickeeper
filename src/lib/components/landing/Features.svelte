<script>
	import { ArrowRight, Download, FolderKanban } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
</script>

<section id="features" class="container space-y-6 py-8 dark:bg-transparent md:py-12 lg:py-24">
	<div class="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
		<h2 class="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
		<p
			class="balance-text max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7"
		>
			The philosophy of this project started from a desire to have more control and freedom on my
			music and be less dependant of music streaming service. So if tomorrow the one you use doesn't
			exist, you are able keep the content of playlists, saved albums, following or artists. It also
			aim to help you switch from music streaming service.
		</p>
	</div>
	<div class="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
		<div class="relative overflow-hidden rounded-lg border bg-background p-2">
			<div class="flex h-[180px] flex-col justify-between rounded-md p-5">
				<Download class="size-12" />

				<div class="space-y-2">
					<h3 class="font-bold">Extract</h3>
					<p class="text-sm text-muted-foreground">
						Extract your playlists and albums as a simple .txt files
					</p>
				</div>
			</div>
		</div>
		<div class="relative overflow-hidden rounded-lg border bg-background p-2">
			<div class="flex h-[180px] flex-col justify-between rounded-md p-5">
				<ArrowRight class="size-12" />
				<div class="space-y-2">
					<h3 class="font-bold">
						Transfer
						<Badge variant="secondary" radius="sm" className="h-5 px-1.5 text-xs font-medium">
							Soon
						</Badge>
					</h3>
					<p class="text-sm text-muted-foreground">
						Transfer your music library from one streaming service to another
					</p>
				</div>
			</div>
		</div>
		<div class="relative overflow-hidden rounded-lg border bg-background p-2">
			<div class="flex h-[180px] flex-col justify-between rounded-md p-5">
				<FolderKanban class="size-12" />
				<div class="space-y-2">
					<h3 class="font-bold">
						Manage
						<Badge variant="secondary" radius="sm" className="h-5 px-1.5 text-xs font-medium">
							Soon
						</Badge>
					</h3>
					<p class="text-sm text-muted-foreground">
						Manage your music library. Centralize all your music libraries from streaming services
						all in one place
					</p>
				</div>
			</div>
		</div>
		<div class="relative overflow-hidden rounded-lg border bg-background p-2">
			<div class="flex h-[180px] flex-col justify-between rounded-md p-5">
				<div class="flex justify-between">
					<i class="si si-applemusic mr-2 text-4xl"></i>
					<i class="si si-soundcloud mr-2 text-4xl"></i>
					<i class="si si-tidal mr-2 text-4xl"></i>
					<i class="si si-youtubemusic mr-2 text-4xl"></i>
				</div>
				<div class="space-y-2">
					<h3 class="font-bold">
						Connect
						<Badge variant="secondary" radius="sm" className="h-5 px-1.5 text-xs font-medium">
							Soon
						</Badge>
					</h3>
					<p class="mt-3 text-sm text-muted-foreground">Connect to all streaming services</p>
				</div>
			</div>
		</div>
	</div>
	<div class="mx-auto text-center md:max-w-[58rem]">
		<p class="balance-text leading-normal text-muted-foreground sm:text-lg sm:leading-7">
			Do not hesitate to request new features you would like to have.
		</p>
	</div>
</section>
