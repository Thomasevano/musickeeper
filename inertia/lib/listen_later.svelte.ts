import {
  createListenLaterStorage,
  type LibraryAccess,
} from '../../src/infrastructure/storage/listen_later_storage.js'

export const library = $state<{ access: LibraryAccess }>({ access: 'available' })
export const listenLaterStorage = createListenLaterStorage(undefined, undefined, (access) => {
  library.access = access
})
