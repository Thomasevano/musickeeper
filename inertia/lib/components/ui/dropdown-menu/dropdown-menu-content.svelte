<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		sideOffset = 4,
		portalProps,
		class: className,
		onOpenAutoFocus,
		...restProps
	}: DropdownMenuPrimitive.ContentProps & {
		portalProps?: DropdownMenuPrimitive.PortalProps;
	} = $props();

	/**
	 * bits-ui focuses the menu in the same frame it is inserted, and the first
	 * item a fraction of a millisecond after that - both before the open
	 * animation has painted anything. VoiceOver reads the menu that appeared and
	 * drops the focus move inside it, so the first item opens silent while every
	 * later item reads correctly. Holding the focus back until the menu is on
	 * screen leaves one announcement, on a target the reader can see.
	 */
	async function focusWhenPainted(content: HTMLElement) {
		await Promise.allSettled(content.getAnimations().map((animation) => animation.finished));
		// A frame of its own for the case where there was no animation to wait for.
		await new Promise(requestAnimationFrame);
		// Escape can land inside that gap: focusing a menu on its way out would take
		// focus off the trigger bits-ui just gave it back to.
		if (!content.isConnected || content.dataset.state === "closed") return;
		content.focus();
	}

	function handleOpenAutoFocus(event: Event) {
		onOpenAutoFocus?.(event);
		if (event.defaultPrevented) return;
		event.preventDefault();
		if (ref) focusWhenPainted(ref);
	}
</script>

<DropdownMenuPrimitive.Portal {...portalProps}>
	<DropdownMenuPrimitive.Content
		bind:ref
		{sideOffset}
		class={cn(
			"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md outline-hidden",
			className
		)}
		onOpenAutoFocus={handleOpenAutoFocus}
		{...restProps}
	/>
</DropdownMenuPrimitive.Portal>
