import { fetchSongsFromPlaylist } from "./spotify_fetch_infos_service"
import { getAllPlaylists } from "$helpers/get-all-playlists"
import type { Cookies } from "@sveltejs/kit";

export async function generateAllPlaylists(fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, cookies: Cookies) {
  const userPlaylists = await getAllPlaylists(fetch, cookies)
  let downloads: { fileName: string; playlistTracks: Array<string> }[] = [];
  let index = 0;
  while (index < userPlaylists.length) {
    const playlist = userPlaylists[index];

    const REQUEST_INTERVAL = 0;
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));

    const playlistTracks = await generateTracksFromPlaylist(fetch, playlist.tracks.href);
    const fileName = (playlist.name ? playlist.name.replace('/', '-') : "untiltled playlist of " + playlist.owner.display_name) + ".txt";

    console.log({ index, fileName })
    downloads.push({ fileName, playlistTracks });
    index++;
  }
  return downloads
}

export async function generateTracksFromPlaylist(fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, playlistUrl: string) {
  let url = playlistUrl
  let result = await fetchSongsFromPlaylist(fetch, url)
  result = await result.json()

  let nextUrl = result.next
  const totalItems = result.total
  const tracks: Array<string> = []
  while (tracks.length < totalItems) {
    if (url != playlistUrl) {
      result = await fetchSongsFromPlaylist(fetch, url);
      result = await result.json();
      nextUrl = result.next
    }
    tracks.push(...result.items.map((item: SpotifyApi.PlaylistTrackObject) => {
      const artists = item.track?.artists.map((artist: SpotifyApi.ArtistObjectSimplified) => artist.name).join(', ');
      if (item.track !== null) {
        return `${artists} - ${item.track?.name}`;
      }
      return
    }));
    url = nextUrl;
  }
  return tracks
}

export async function extractPlaylist(fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, playlistUrl: string, playlistName: string) {
  const tracks = await generateTracksFromPlaylist(fetch, playlistUrl)
  const textFile = createTextFile(tracks)

  return createDownloadLink(textFile, playlistName + ".txt")
}

export function createTextFile(tracks: Array<string>) {
  // Create a blob object with the file content which you want to add to the file
  return new Blob([tracks.join('\n')], { type: 'text/plain' });
}

export function createDownloadLink(file: Blob, downloadFileName: string) {
  // Create element with <a> tag
  const link = document.createElement("a");

  // Add file content in the object URL
  link.href = URL.createObjectURL(file);

  // Add file name
  link.download = downloadFileName;

  // Add click event to <a> tag to save file.
  link.click();
  URL.revokeObjectURL(link.href);
}
