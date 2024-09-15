import vine from '@vinejs/vine'
import { type Infer } from '@vinejs/vine/types'
import { SongSchema } from './Song'

const SongsListSchema = vine.object({
  id: vine.string().minLength(1),
  name: vine.string().minLength(1),
  description: vine.string().minLength(1),
  owner: vine.string().minLength(1),
  songs: vine.array(SongSchema),
  href: vine.string().activeUrl(),
  imageUrl: vine.string().activeUrl(),
})

export type SongsList = Infer<typeof SongsListSchema>