<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';

	let className: string | null | undefined = undefined;
	export { className as class };

	export let user;
</script>

<div class={cn('pb-12', className)}>
	<div class="space-y-4 py-4">
		<div class="px-3 py-2">
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
					<div>
						<p class="text-sm font-medium leading-none">{user.username}</p>
					</div>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Label>My Account</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>Profile</DropdownMenu.Item>
						<DropdownMenu.Item>
							<form method="post" use:enhance>
								<button>Sign out</button>
							</form>
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Library</h2>
			<div class="space-y-1">
				<Button variant="ghost" href="#" class="w-full justify-start">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mr-2 h-4 w-4"
					>
						<path d="M21 15V6" />
						<path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
						<path d="M12 12H3" />
						<path d="M16 6H3" />
						<path d="M12 18H3" />
					</svg>
					Playlists
				</Button>
				<Button variant="ghost" href="#" class="w-full justify-start">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mr-2 h-4 w-4"
					>
						<path d="m16 6 4 14" />
						<path d="M12 6v14" />
						<path d="M8 8v12" />
						<path d="M4 4v16" />
					</svg>
					Albums
				</Button>
			</div>
		</div>
	</div>
</div>
