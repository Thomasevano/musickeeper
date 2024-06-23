import { fetchSongsFromPlaylist } from "./spotify_fetch_infos_service"

async function generatePlaylistFile(fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, playlistUrl: string, playlistName:string) {
  let url = playlistUrl
  let result = await fetchSongsFromPlaylist(fetch, url)
  result = await result.json()
  
  let nextUrl = result.next
  const totalItems = result.total
  const tracks: Array<string> = []
  while (tracks.length < totalItems) {
    if (url != playlistUrl) {
      result = await fetchSongsFromPlaylist(fetch, url)
      result = await result.json()
      nextUrl = result.next
    }
    result.items.forEach(element => {
      let track:string = ''
      element.track.artists.forEach((artist, index) => {
        if (index === element.track.artists.length -1) {
          track +=`${artist.name} `;
        }
        else {
          track +=`${artist.name}, `;
        }
      })
      track += `- ${element.track.name}`;
      tracks.push(track)
    });
    url = nextUrl
  }

  // Create element with <a> tag
const link = document.createElement("a");

// Create a blob object with the file content which you want to add to the file
const file = new Blob([tracks.join('\n')], { type: 'text/plain' });

// Add file content in the object URL
link.href = URL.createObjectURL(file);

// Add file name
link.download = `${playlistName}.txt`;

// Add click event to <a> tag to save file.
link.click();
URL.revokeObjectURL(link.href);
}

export { generatePlaylistFile }
