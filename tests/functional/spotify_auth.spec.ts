import { test } from '@japa/runner'

test.group('Spotify Authentication', () => {
  test('unauthorized user should see error page on callback', async ({ client, assert }) => {
    // Mock Spotify token endpoint - returns valid tokens
    const mockTokenResponse = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expires_in: 3600,
    }

    // Mock Spotify user endpoint - returns 403 for unauthorized user
    const originalFetch = global.fetch
    global.fetch = async (url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      // Mock token endpoint
      if (urlString.includes('accounts.spotify.com/api/token')) {
        return {
          ok: true,
          json: async () => mockTokenResponse,
        } as Response
      }

      // Mock user endpoint - return 403 for unauthorized user
      if (urlString.includes('api.spotify.com/v1/me')) {
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        } as Response
      }

      return originalFetch(url, options)
    }

    try {
      // Set the state cookie to match the callback
      const state = 'test_state_123'

      // Make the callback request
      const response = await client
        .get('/auth/spotify/callback')
        .qs({ code: 'mock_auth_code', state })
        .cookie('spotify_auth_state', state)

      // Assert that we got the unauthorized access page
      assert.equal(response.status(), 200)

      // For Inertia responses, check the page component
      const inertiaPage = response.inertiaPage()
      assert.equal(inertiaPage.component, 'errors/unauthorized_access')

      // Verify no auth cookies were set
      const cookies = response.cookies()
      assert.isUndefined(cookies.spotify_access_token)
      assert.isUndefined(cookies.spotify_refresh_token)
    } finally {
      // Restore original fetch
      global.fetch = originalFetch
    }
  })

  test('authorized user should be redirected to listen later', async ({ client, assert }) => {
    // Mock Spotify token endpoint - returns valid tokens
    const mockTokenResponse = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expires_in: 3600,
    }

    // Mock Spotify user endpoint - returns successful user data
    const mockUserResponse = {
      id: 'test_user_123',
      display_name: 'Test User',
      email: 'test@example.com',
      images: [{ url: 'https://example.com/avatar.jpg', height: 64, width: 64 }],
    }

    // Mock fetch
    const originalFetch = global.fetch
    global.fetch = async (url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      // Mock token endpoint
      if (urlString.includes('accounts.spotify.com/api/token')) {
        return {
          ok: true,
          json: async () => mockTokenResponse,
        } as Response
      }

      // Mock user endpoint - return successful response
      if (urlString.includes('api.spotify.com/v1/me')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockUserResponse,
        } as Response
      }

      return originalFetch(url, options)
    }

    try {
      // Set the state cookie to match the callback
      const state = 'test_state_456'

      // Make the callback request
      const response = await client
        .get('/auth/spotify/callback')
        .qs({ code: 'mock_auth_code', state })
        .cookie('spotify_auth_state', state)

      // Assert that we got redirected to listen later
      assert.equal(response.status(), 302)
      assert.equal(response.headers()['location'], '/library/listen-later')

      // Verify auth cookies were set (encrypted cookies won't be readable directly)
      const cookies = response.cookies()
      assert.isDefined(cookies.spotify_access_token)
      assert.isDefined(cookies.spotify_refresh_token)
      assert.isDefined(cookies.spotify_access_token_expires_at)
    } finally {
      // Restore original fetch
      global.fetch = originalFetch
    }
  })

  test('callback should fail with invalid state', async ({ client, assert }) => {
    const response = await client
      .get('/auth/spotify/callback')
      .qs({ code: 'mock_auth_code', state: 'invalid_state' })
      .cookie('spotify_auth_state', 'different_state')

    // Should redirect to home with error
    assert.equal(response.status(), 302)
    assert.include(response.headers()['location'], '/')
    assert.include(response.headers()['location'], 'error=state_mismatch')
  })
})
