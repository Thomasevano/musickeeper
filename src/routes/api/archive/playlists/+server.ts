import JSZip from 'jszip';
import type { RequestHandler } from "@sveltejs/kit";
import { generateAllPlaylists } from "../../../../services/generate_playlist_service";

export const GET: RequestHandler = async ({ fetch, cookies, request, params, url }) => {
  const downloads = await generateAllPlaylists(fetch, cookies)
  var zip = new JSZip();

  downloads.forEach(download => {
    zip.file(download.fileName, download.playlistTracks.join('\n'))
  });
  const archive = await zip.generateAsync({ type: "blob" });

  return new Response(archive, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip'
    }
  })
}