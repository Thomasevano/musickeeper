import type { LayoutServerLoad } from './$types';

export type OutputType = { user: object; isLoggedIn: boolean };
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (user) {
		// Return the output object
		return { user, isLoggedIn: true };
	}
	// Return the output object
	return {
		user: undefined,
		isLoggedIn: false
	};
};
