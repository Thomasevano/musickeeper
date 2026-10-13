import { test } from '@japa/runner'
import LinkController from '#infrastructure/http/controllers/link_controller.js'
import { FetchPlatformMetadataUseCase } from '#application/use-cases/fetch_platform_metadata.use_case.js'
import { LinkParserAdapter } from '#infrastructure/adapters/link_parser.adapter.js'
import {
  PlatformMetadataPort,
  type PlatformMetadata,
} from '#application/ports/platform_metadata.port.js'
import type { ParsedLink } from '#domain/link.js'

class StubPlatformMetadata extends PlatformMetadataPort {
  constructor(private result: PlatformMetadata | { error: string }) {
    super()
  }

  async fetch(_parsedLink: ParsedLink): Promise<PlatformMetadata | { error: string }> {
    return this.result
  }
}

interface MockResponse {
  status: number
  body: unknown
}

function requestPlatformMetadata(
  body: Record<string, unknown>,
  platformResult: PlatformMetadata | { error: string } = { title: 'Track', artist: 'Artist' }
) {
  const controller = new LinkController(
    new FetchPlatformMetadataUseCase(
      new LinkParserAdapter(),
      new StubPlatformMetadata(platformResult)
    )
  )
  const result: MockResponse = { status: 200, body: null }
  const context = {
    request: { body: () => body },
    response: {
      status(code: number) {
        result.status = code
        return this
      },
      json(data: unknown) {
        result.body = data
        return result
      },
    },
  }

  return controller.platformMetadata(context as never).then(() => result)
}

test.group('LinkController - platform metadata', () => {
  test('returns the platform draft contract', async ({ assert }) => {
    const response = await requestPlatformMetadata(
      { url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' },
      {
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        thumbnailUrl: 'https://images.example/cover.jpg',
        albumName: 'Whenever You Need Somebody',
      }
    )

    assert.equal(response.status, 200)
    assert.deepInclude(response.body as object, {
      source: 'link',
      linkMetadata: {
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        type: 'track',
        platform: 'spotify',
        thumbnailUrl: 'https://images.example/cover.jpg',
        albumName: 'Whenever You Need Somebody',
        originalUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      },
    })
  })

  test('rejects malformed links', async ({ assert }) => {
    const response = await requestPlatformMetadata({ url: 'not-a-valid-url' })

    assert.equal(response.status, 400)
    assert.deepEqual(response.body, {
      error: 'Invalid URL format',
      originalUrl: 'not-a-valid-url',
    })
  })
})
