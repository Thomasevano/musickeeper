import vine from '@vinejs/vine'
import { type Infer } from '@vinejs/vine/types'
import { ArtistSchema } from './Artist'

export const SongSchema = vine.object({
  id: vine.string().minLength(1),
  name: vine.string().minLength(1),
  url: vine.string().activeUrl(),
  artists: vine.array(ArtistSchema)
})

export type SongDTO = Infer<typeof SongSchema>
