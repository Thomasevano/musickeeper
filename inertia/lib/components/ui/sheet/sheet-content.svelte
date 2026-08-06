<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";
	export const sheetVariants = tv({
		base: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 gap-4 p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 motion-reduce:data-[state=closed]:fade-out-0 motion-reduce:data-[state=open]:fade-in-0",
		variants: {
			side: {
				top: "motion-safe:data-[state=closed]:slide-out-to-top motion-safe:data-[state=open]:slide-in-from-top inset-x-0 top-0 border-b",
				bottom: "motion-safe:data-[state=closed]:slide-out-to-bottom motion-safe:data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 border-t",
				left: "motion-safe:data-[state=closed]:slide-out-to-left motion-safe:data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
				right: "motion-safe:data-[state=closed]:slide-out-to-right motion-safe:data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
			},
		},
		defaultVariants: {
			side: "right",
		},
	});

	export type Side = VariantProps<typeof sheetVariants>["side"];
</script>

<script lang="ts">
	import { Dialog as SheetPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import X from "@lucide/svelte/icons/x";
	import type { Snippet } from "svelte";
	import SheetOverlay from "./sheet-overlay.svelte";
	import { cn } from "$lib/utils.js";
	import { controlHeights } from "../control_heights.js";

	let {
		ref = $bindable(null),
		class: className,
		side = "right",
		portalProps,
		children,
		...restProps
	}: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
		portalProps?: SheetPrimitive.PortalProps;
		side?: Side;
		children: Snippet;
	} = $props();
</script>

<SheetPrimitive.Portal {...portalProps}>
	<SheetOverlay />
	<SheetPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		class={cn(sheetVariants({ side }), className)}
		{...restProps}
	>
		{@render children?.()}
		<SheetPrimitive.Close
			class={cn(
				"ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute right-4 top-4 flex items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none",
				controlHeights.iconButton,
			)}
		>
			<X class="size-4" />
			<span class="sr-only">Close</span>
		</SheetPrimitive.Close>
	</SheetPrimitive.Content>
</SheetPrimitive.Portal>
