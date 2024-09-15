import vine from '@vinejs/vine'
import { type Infer } from '@vinejs/vine/types'
import { ArtistSchema } from './Artist'
import { type Dictionary } from '$lib/types'

export const SongSchema = vine.object({
  id: vine.string().minLength(1),
  name: vine.string().minLength(1),
  url: vine.string().activeUrl(),
  artists: vine.array(ArtistSchema)
})

export type Song = Infer<typeof SongSchema>

// export function createSong(data: Dictionary): Song {
//   const result = SongSchema.parse(data);

//   if (!result.success) {
//     throw new Error(`Can not parse song from invalid data: ${result.error.message}`);
//   }

//   return result.data;
// }