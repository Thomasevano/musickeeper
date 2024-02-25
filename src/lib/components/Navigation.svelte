<script lang="ts">
	import ToggleTheme from './ToggleTheme.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';

	export let user;
	const userIsDefined = Object.keys(user).length !== 0 && user.constructor === Object;
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
					class="inline-flex items-center justify-center p-2 text-gray-400 hover:text-black focus:text-black focus:outline-none md:hidden lg:hidden"
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
			<nav class="hidden flex-grow flex-col md:flex md:flex-row md:justify-center md:pb-0">
				{#if !userIsDefined}
					<div class="md:ml-auto md:justify-between">
						<Button href="/#features" variant="link">Features</Button>
					</div>
				{/if}
				<div class="flex md:ml-auto">
					<ToggleTheme />
					{#if userIsDefined}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger class="mb-4 flex items-center space-x-4">
								<Avatar.Root>
									{#if user.images}
										<Avatar.Image src={user.images[0].url} alt={user.username} />
									{/if}
									<Avatar.Fallback
										>{`${user.username.charAt(0) + user.username.charAt(1)}`}</Avatar.Fallback
									>
								</Avatar.Root>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Group>
									<DropdownMenu.Label>{user.username}</DropdownMenu.Label>
									<DropdownMenu.Label>{user.email}</DropdownMenu.Label>
									<DropdownMenu.Separator />
									<DropdownMenu.Item>
										<form method="post" use:enhance>
											<button>Sign out</button>
										</form>
									</DropdownMenu.Item>
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{:else}
						<Button href="/login">Login</Button>
						<Button>Sign up</Button>
					{/if}
				</div>
			</nav>
		</div>
	</div>
</section>
