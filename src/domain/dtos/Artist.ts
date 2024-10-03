import vine from '@vinejs/vine'
import { type Infer } from '@vinejs/vine/types'

export const ArtistSchema = vine.object({
  id: vine.string().minLength(1),
  name: vine.string().minLength(1)
})

export type Artist = Infer<typeof ArtistSchema>
