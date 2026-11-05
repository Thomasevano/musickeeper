<script lang="ts">
  import { flushSync } from 'svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import Button from '$lib/components/ui/button/button.svelte'
  import { appUpdate, prepareReload } from '$lib/app_update.svelte'
  import { hasUnsavedWork, createReloadBarrier } from '$lib/reload_guard'

  let confirming = $state(false)
  let busy = $state(false)
  let navigating = $state(false)
  let reloadButton: HTMLButtonElement | null = $state(null)
  let reloadDialog: HTMLDivElement | null = $state(null)

  async function reload(discardConfirmed = false) {
    if (busy) return
    appUpdate.error = ''
    busy = true
    const waitForWrites = createReloadBarrier()
    try {
      await waitForWrites()
      if (!discardConfirmed && hasUnsavedWork()) {
        confirming = true
        return
      }
      const url = await prepareReload()
      await waitForWrites()
      if (!discardConfirmed && hasUnsavedWork()) {
        confirming = true
        return
      }
      if (!navigator.onLine) throw new Error('Reconnect before reloading MusicKeeper.')
      flushSync(() => { navigating = true })
      reloadDialog?.focus()
      window.location.assign(url)
    } catch {
      navigating = false
      appUpdate.error = 'MusicKeeper could not reload. Check your connection and any unsaved changes, then try again.'
    } finally {
      if (!navigating) busy = false
    }
  }

  function cancelReload() {
    window.stop()
    navigating = false
    confirming = false
    busy = false
  }
</script>

<p role="status" class="sr-only">{appUpdate.available ? 'A new version of MusicKeeper is ready.' : ''}</p>

{#if appUpdate.available}
  <section aria-label="Application update" class="border-y border-border bg-muted/50 px-4 py-3 md:px-12 lg:px-16">
    <div class="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
      <div class="space-y-1 text-sm">
        <p aria-hidden="true" class="font-medium">A new version of MusicKeeper is ready.</p>
        <p>Reload to help avoid issues with an outdated version. Your Listen Later List stays on this device.</p>
      </div>
      <Button bind:ref={reloadButton} variant="outline" class={busy ? 'cursor-wait' : 'cursor-pointer'} aria-disabled={busy} onclick={() => reload()}>
        {busy ? 'Preparing update…' : 'Reload to update'}
      </Button>
    </div>
    {#if appUpdate.error && !confirming && !navigating}
      <p role="alert" class="mt-2 text-sm text-destructive">{appUpdate.error}</p>
    {/if}
  </section>
{/if}

<Dialog.Root open={confirming || navigating} onOpenChange={(open) => { if (!busy) confirming = open }}>
  <Dialog.Content
    bind:ref={reloadDialog}
    showCloseButton={false}
    interactOutsideBehavior={busy ? 'ignore' : 'close'}
    escapeKeydownBehavior={busy ? 'ignore' : 'close'}
    onCloseAutoFocus={(event) => { event.preventDefault(); reloadButton?.focus() }}
  >
    <Dialog.Header>
      <Dialog.Title>{navigating ? 'Loading the update…' : 'Reload and discard unsaved changes?'}</Dialog.Title>
      <Dialog.Description>
        {#if navigating}
          Please wait before you make more changes. If loading takes too long, cancel the reload to keep editing.
        {:else}
          Your unfinished input will be lost. Items already saved in your Listen Later List will remain.
        {/if}
      </Dialog.Description>
    </Dialog.Header>
    {#if appUpdate.error}
      <p role="alert" class="text-sm text-destructive">{appUpdate.error}</p>
    {/if}
    <Dialog.Footer>
      {#if navigating}
        <Button variant="outline" onclick={cancelReload}>Cancel reload</Button>
      {:else}
        <Button variant="outline" disabled={busy} onclick={() => (confirming = false)}>Keep editing</Button>
        <Button disabled={busy} onclick={() => reload(true)}>
          {busy ? 'Preparing update…' : 'Discard changes and reload'}
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
