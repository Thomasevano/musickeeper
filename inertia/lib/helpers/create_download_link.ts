export default function createDownloadLink(file: Blob, downloadFileName: string) {
  // Create element with <a> tag
  const link = document.createElement('a')

  // Add file content in the object URL
  link.href = URL.createObjectURL(file)

  // Add file name
  link.download = downloadFileName

  // Add click event to <a> tag to save file.
  link.click()
  URL.revokeObjectURL(link.href)
}
