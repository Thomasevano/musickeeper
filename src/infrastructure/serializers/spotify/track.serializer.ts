import { Artist } from '../../../domain/artist.js'
import { Track } from '../../../domain/track.js'

export function serializeTrackInfosFromSpotify(spotifyTrack: SpotifyApi.TrackObjectFull): Track {
  const artists = spotifyTrack.artists.map(
    (artist: SpotifyApi.ArtistObjectSimplified) =>
      new Artist({
        id: artist.id,
        name: artist.name,
      })
  )

  const track = new Track({
    id: spotifyTrack.id,
    title: spotifyTrack.name,
    link: spotifyTrack.href,
    artists: artists.map((artist) => artist.name),
  })
  return track
}
