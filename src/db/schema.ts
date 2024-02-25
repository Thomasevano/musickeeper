import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const tableNames = {
	user: 'user',
	session: 'session',
	OAuthAccount: 'oauth_account'
};

export const userTable = sqliteTable(tableNames.user, {
	id: text('id').notNull().primaryKey(),
	username: text('username').notNull(),
	email: text('email').notNull()
});

export const sessionTable = sqliteTable(tableNames.session, {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	expiresAt: integer('expires_at').notNull()
});

export const OAuthAccountTable = sqliteTable(tableNames.OAuthAccount, {
	providerId: text('provider_id').notNull().primaryKey(),
	providerUserId: text('provider_user_id').notNull(),
	userId: text('user_id').references(() => userTable.id)
});
