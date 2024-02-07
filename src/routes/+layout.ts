import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ data, url }) => {
	const { user } = data || {};
	if (!user && url.pathname !== '/') {
		throw redirect(307, '/');
	}

	return {
		user,
	};
};