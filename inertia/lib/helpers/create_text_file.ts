export default function createTextFile(tracks: Array<string>) {
  // Create a blob object with the file content which you want to add to the file
  return new Blob([tracks.join('\n')], { type: 'text/plain' })
}
