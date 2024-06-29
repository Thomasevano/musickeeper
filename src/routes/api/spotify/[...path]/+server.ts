import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { PUBLIC_SPOTIFY_BASE_URL } from "$env/static/public";

export const GET: RequestHandler = async ({ fetch, cookies, request, params, url }) => {
	const spotifyAccessToken = cookies.get('spotify_access_token');
	console.log({ spotifyAccessToken })

	let response
	if (spotifyAccessToken) {
		response = await fetch(`${PUBLIC_SPOTIFY_BASE_URL}/${params.path}${url.search}`, {
			headers: {
				Authorization: `Bearer ${spotifyAccessToken}`
			}
		});
	}
	else {
		response = await fetch(`${PUBLIC_SPOTIFY_BASE_URL}/${params.path}${url.search}`, {
			headers: request.headers
		});
	}
	const responseJSON = await response.json();
	// console.log(responseJSON)

	if (responseJSON.error) {
		throw error(responseJSON.error.status, responseJSON.error.message);
	}
	return json(responseJSON);
};
