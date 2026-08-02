import type { IReleaseMatch } from 'musicbrainz-api'

/**
 * Address the representative front cover selected for a release group.
 *
 * The archive chooses artwork from a release in the group and redirects
 * straight to it. The URL is therefore derivable without an API call.
 */
export function coverArtUrlForRelease(release: IReleaseMatch): string | undefined {
  const releaseGroupId = release['release-group']?.id
  return releaseGroupId
    ? `https://coverartarchive.org/release-group/${releaseGroupId}/front-250`
    : undefined
}
