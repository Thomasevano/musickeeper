const unsavedChecks = new Set<() => boolean>()
const pendingWrites = new Set<Promise<unknown>>()
let writeFailures = 0

export function registerUnsavedWork(check: () => boolean): () => void {
  unsavedChecks.add(check)
  return () => {
    unsavedChecks.delete(check)
  }
}

export function hasUnsavedWork(): boolean {
  for (const check of unsavedChecks) {
    if (check()) return true
  }
  return false
}

export function trackWrite<T>(operation: () => Promise<T>): Promise<T> {
  const write = Promise.resolve().then(operation)
  pendingWrites.add(write)
  void write.then(
    () => pendingWrites.delete(write),
    () => {
      writeFailures++
      pendingWrites.delete(write)
    }
  )
  return write
}

export function createReloadBarrier(): () => Promise<void> {
  const failuresAtStart = writeFailures
  return async () => {
    while (pendingWrites.size) {
      await Promise.all(pendingWrites)
    }
    // Include writes that finished while the network/worker was being prepared.
    if (writeFailures !== failuresAtStart) throw new Error('A list write failed during reload.')
  }
}
