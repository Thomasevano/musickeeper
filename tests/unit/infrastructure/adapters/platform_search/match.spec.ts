import { test } from '@japa/runner'
import { matchesArtist } from '#infrastructure/adapters/platform_search/match.js'

test.group('platform_search — matchesArtist', () => {
  test('returns true when artist name matches case-insensitively', ({ assert }) => {
    assert.isTrue(matchesArtist('Rick Astley', ['rick astley']))
    assert.isTrue(matchesArtist('RICK ASTLEY', ['Rick Astley']))
  })

  test('returns true when artistName contains one of the artists as substring', ({ assert }) => {
    assert.isTrue(matchesArtist('Rick Astley & Friends', ['Rick Astley']))
    assert.isTrue(matchesArtist('The Beatles', ['Beatles']))
  })

  test('returns true when any artist in the list matches', ({ assert }) => {
    assert.isTrue(matchesArtist('Daft Punk', ['Madonna', 'Daft Punk', 'Prince']))
  })

  test('returns false when no artist matches', ({ assert }) => {
    assert.isFalse(matchesArtist('Rick Astley', ['Madonna', 'Prince']))
  })

  test('returns false for empty artists array', ({ assert }) => {
    assert.isFalse(matchesArtist('Rick Astley', []))
  })

  test('returns true when expected artist is empty string (substring match)', ({ assert }) => {
    // Empty string is a substring of any string — current behavior, document it
    assert.isTrue(matchesArtist('Rick Astley', ['']))
  })

  test('does NOT strip diacritics — Beyoncé != Beyonce', ({ assert }) => {
    // Document current behavior: case-insensitive substring only, no normalization
    assert.isFalse(matchesArtist('Beyonce', ['Beyoncé']))
    assert.isFalse(matchesArtist('Beyoncé', ['Beyonce']))
  })

  test('handles partial first-name matches', ({ assert }) => {
    // "PNL" in "PNL feat. Damso" → match
    assert.isTrue(matchesArtist('PNL feat. Damso', ['PNL']))
  })

  test('matches when expected artist longer than artistName fails', ({ assert }) => {
    // "Rick Astley Greatest Hits" does not contain "Rick Astley Live"
    assert.isFalse(matchesArtist('Rick Astley Greatest Hits', ['Rick Astley Live']))
  })

  test('whitespace-sensitive — surrounding spaces in expected artist break match', ({ assert }) => {
    // " rick astley " is NOT a substring of "rick astley"
    assert.isFalse(matchesArtist('Rick Astley', [' Rick Astley ']))
  })
})
