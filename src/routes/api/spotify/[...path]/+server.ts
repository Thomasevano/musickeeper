import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { PUBLIC_SPOTIFY_BASE_URL } from "$env/static/public";

export const GET: RequestHandler = async ({ fetch, cookies, params, url }) => {
	const spotifyAccessToken = cookies.get('spotify_access_token');

	const response = await fetch(`${PUBLIC_SPOTIFY_BASE_URL}/${params.path}${url.search}`, {
		headers: {
			Authorization: `Bearer ${spotifyAccessToken}`
		}
	});
	const responseJSON = await response.json();

	if (responseJSON.error) {
		throw error(responseJSON.error.status, responseJSON.error.message);
	}
	return json(responseJSON);
};
