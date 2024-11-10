import { test } from '@japa/runner'

test('returns correct data', async ({ client }) => {
  const response = await client.get('/').withInertia()

  response.assertStatus(200)
  response.assertInertiaComponent('home')
})
