<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import Button from '$lib/components/ui/button/button.svelte'
  import { appUpdate, prepareReload } from '$lib/app_update.svelte'
  import { hasUnsavedWork, createReloadBarrier } from '$lib/reload_guard'

  let confirming = $state(false)
  let busy = $state(false)
  let reloadButton: HTMLButtonElement | null = $state(null)

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
      window.location.assign(url)
    } catch {
      appUpdate.error = 'MusicKeeper could not reload. Check your connection and any unsaved changes, then try again.'
    } finally {
      busy = false
    }
  }
</script>

<p role="status" class="sr-only">{appUpdate.available ? 'A MusicKeeper update is available.' : ''}</p>

{#if appUpdate.available}
  <section aria-label="Application update" class="border-y border-border bg-muted/50 px-4 py-3 md:px-12 lg:px-16">
    <div class="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
      <p aria-hidden="true" class="text-sm">A MusicKeeper update is available.</p>
      <Button bind:ref={reloadButton} variant="outline" aria-disabled={busy} onclick={() => reload()}>
        {busy ? 'Preparing update…' : 'Reload MusicKeeper'}
      </Button>
    </div>
    {#if appUpdate.error && !confirming}
      <p role="alert" class="mt-2 text-sm text-destructive">{appUpdate.error}</p>
    {/if}
  </section>
{/if}

<Dialog.Root bind:open={confirming}>
  <Dialog.Content
    showCloseButton={false}
    interactOutsideBehavior={busy ? 'ignore' : 'close'}
    escapeKeydownBehavior={busy ? 'ignore' : 'close'}
    onCloseAutoFocus={(event) => { event.preventDefault(); reloadButton?.focus() }}
  >
    <Dialog.Header>
      <Dialog.Title>Reload and discard unsaved changes?</Dialog.Title>
      <Dialog.Description>
        Your unfinished input will be lost. Items already saved in your Listen Later List will remain.
      </Dialog.Description>
    </Dialog.Header>
    {#if appUpdate.error}
      <p role="alert" class="text-sm text-destructive">{appUpdate.error}</p>
    {/if}
    <Dialog.Footer>
      <Button variant="outline" disabled={busy} onclick={() => (confirming = false)}>Keep editing</Button>
      <Button disabled={busy} onclick={() => reload(true)}>
        {busy ? 'Preparing update…' : 'Discard changes and reload'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
