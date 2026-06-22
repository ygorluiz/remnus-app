import { pgTable, text, integer, timestamp, boolean, jsonb, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const workspaces = pgTable('workspaces', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  icon:      text('icon'),
  iconColor: text('icon_color'),
  sortOrder: integer('sort_order').notNull().default(0),
  billingOwnerId: text('billing_owner_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workspaceItems = pgTable('workspace_items', {
  id:          text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  type:        text('type', { enum: ['page', 'database'] }).notNull(),
  title:       text('title').notNull(),
  parentId:    text('parent_id'),
  sortOrder:   integer('sort_order').notNull().default(0),
  icon:        text('icon'),
  iconColor:   text('icon_color'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('workspace_items_workspace_id_idx').on(table.workspaceId),
  index('workspace_items_parent_id_idx').on(table.parentId),
]);

export const standalonePages = pgTable('standalone_pages', {
  id:        text('id').primaryKey(),
  itemId:    text('item_id').notNull().references(() => workspaceItems.id, { onDelete: 'cascade' }),
  content:   text('content').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('standalone_pages_item_id_idx').on(table.itemId),
]);

export const databases = pgTable('databases', {
  id:     text('id').primaryKey(),
  name:   text('name').notNull(),
  itemId: text('item_id').references(() => workspaceItems.id, { onDelete: 'set null' }),
  schema: jsonb('schema').notNull().$type<any[]>(),
  views:  jsonb('views').$type<any[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('databases_item_id_idx').on(table.itemId),
]);

export const pages = pgTable('pages', {
  id: text('id').primaryKey(),
  databaseId: text('database_id').notNull().references(() => databases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  properties: jsonb('properties').notNull().$type<Record<string, any>>().default({}),
  sortOrder: integer('sort_order').notNull().default(0),
  icon: text('icon'),
  iconColor: text('icon_color'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  agentEditedAt: timestamp('agent_edited_at'),
  agentTokenId: text('agent_token_id'),
}, (table) => [
  index('pages_database_id_idx').on(table.databaseId),
]);

// ── Auth tables ─────────────────────────────────────────────────────────────

export const users = pgTable('user', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text('name'),
  email:         text('email').unique(),
  emailVerified: timestamp('emailVerified'),
  image:         text('image'),
  passwordHash:  text('password_hash'),
  role:          text('role').notNull().default('user'),
  analyticsConsent: text('analytics_consent'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
});

export const accounts = pgTable('account', {
  userId:            text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text('type').notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        text('token_type'),
  scope:             text('scope'),
  id_token:          text('id_token'),
  session_state:     text('session_state'),
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerAccountId] }),
  index('account_user_id_idx').on(table.userId),
]);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId:       text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires:      timestamp('expires').notNull(),
}, (table) => [
  index('session_user_id_idx').on(table.userId),
]);

export const verification = pgTable('verification', {
  identifier: text('identifier').notNull(),
  token:      text('token').notNull(),
  expires:    timestamp('expires').notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// ── Workspace membership ──────────────────────────────────────────────────────

export const workspaceMembers = pgTable('workspace_members', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:        text('role').notNull().default('member'),
  hidden:      boolean('hidden').notNull().default(false),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('workspace_members_workspace_user_unique').on(table.workspaceId, table.userId),
  index('workspace_members_user_id_idx').on(table.userId),
]);

export const workspaceInvites = pgTable('workspace_invites', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email:       text('email').notNull(),
  role:        text('role').notNull().default('member'),
  token:       text('token').notNull(),
  invitedBy:   text('invited_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at').notNull(),
  expiresAt:   timestamp('expires_at'),
  acceptedAt:  timestamp('accepted_at'),
}, (table) => [
  uniqueIndex('workspace_invites_token_unique').on(table.token),
  index('workspace_invites_workspace_id_idx').on(table.workspaceId),
  index('workspace_invites_email_idx').on(table.email),
]);

// ── MCP Agent Tokens ──────────────────────────────────────────────────────────

export const agentTokens = pgTable('agent_tokens', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  agentName:   text('agent_name'),
  tokenPrefix: text('token_prefix').notNull(),
  tokenHash:   text('token_hash').notNull(),
  scope:       text('scope', { enum: ['read', 'write'] }).notNull(),
  createdBy:   text('created_by').references(() => users.id),
  createdAt:   timestamp('created_at').notNull(),
  expiresAt:   timestamp('expires_at'),
  lastUsedAt:  timestamp('last_used_at'),
  revokedAt:   timestamp('revoked_at'),
}, (table) => [
  index('agent_tokens_workspace_id_idx').on(table.workspaceId),
  index('agent_tokens_token_prefix_idx').on(table.tokenPrefix),
]);

export const clientAuthTokens = pgTable('client_auth_tokens', {
  deviceId:  text('device_id').primaryKey(),
  token:     text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── User engagement / session tracking ───────────────────────────────────────

export const userSessions = pgTable('user_sessions', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt:       timestamp('started_at').notNull(),
  lastSeenAt:      timestamp('last_seen_at').notNull(),
  durationSeconds: integer('duration_seconds').notNull().default(0),
}, (table) => [
  index('user_sessions_user_id_idx').on(table.userId),
  index('user_sessions_last_seen_at_idx').on(table.lastSeenAt),
]);

// ── Uploaded assets (Cloudinary) ──────────────────────────────────────────────

export const uploadedAssets = pgTable('uploaded_assets', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  publicId:     text('public_id').notNull(),
  resourceType: text('resource_type').notNull(),
  kind:         text('kind').notNull(),
  bytes:        integer('bytes').notNull().default(0),
  url:          text('url').notNull(),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId:  text('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uploaded_assets_public_id_unique').on(table.publicId),
  index('uploaded_assets_user_id_idx').on(table.userId),
  index('uploaded_assets_workspace_id_idx').on(table.workspaceId),
]);

// ── Public page sharing ───────────────────────────────────────────────────────

export const sharedPages = pgTable('shared_pages', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug:        text('slug').notNull(),
  pageId:      text('page_id').notNull(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  permission:  text('permission', { enum: ['read', 'write'] }).notNull().default('read'),
  width:       text('width', { enum: ['narrow', 'wide', 'full'] }).notNull().default('narrow'),
  inSitemap:   boolean('in_sitemap').notNull().default(false),
  createdBy:   text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('shared_pages_slug_unique').on(table.slug),
  index('shared_pages_workspace_id_idx').on(table.workspaceId),
  index('shared_pages_page_id_idx').on(table.pageId),
]);

// ── OAuth 2.1 + PKCE tables ───────────────────────────────────────────────────

export const oauthClients = pgTable('oauth_clients', {
  clientId:                text('client_id').primaryKey(),
  clientName:              text('client_name').notNull(),
  redirectUris:            jsonb('redirect_uris').notNull().$type<string[]>(),
  grantTypes:              jsonb('grant_types').notNull().$type<string[]>(),
  responseTypes:           jsonb('response_types').notNull().$type<string[]>(),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method').notNull().default('none'),
  createdAt:               timestamp('created_at').notNull(),
});

export const oauthAuthCodes = pgTable('oauth_auth_codes', {
  code:                text('code').primaryKey(),
  clientId:            text('client_id').notNull(),
  userId:              text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId:         text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  redirectUri:         text('redirect_uri').notNull(),
  codeChallenge:       text('code_challenge').notNull(),
  codeChallengeMethod: text('code_challenge_method').notNull().default('S256'),
  scope:               text('scope').notNull().default('read'),
  agentName:           text('agent_name'),
  displayName:         text('display_name'),
  expiresAt:           timestamp('expires_at').notNull(),
  usedAt:              timestamp('used_at'),
});

export const oauthAccessTokens = pgTable('oauth_access_tokens', {
  id:                 text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tokenPrefix:        text('token_prefix').notNull(),
  tokenHash:          text('token_hash').notNull(),
  refreshTokenPrefix: text('refresh_token_prefix'),
  refreshTokenHash:   text('refresh_token_hash'),
  clientId:           text('client_id').notNull(),
  userId:             text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId:        text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  scope:              text('scope').notNull().default('read'),
  agentName:          text('agent_name'),
  displayName:        text('display_name'),
  expiresAt:          timestamp('expires_at').notNull(),
  revokedAt:          timestamp('revoked_at'),
  createdAt:          timestamp('created_at').notNull(),
}, (table) => [
  index('oauth_access_tokens_prefix_idx').on(table.tokenPrefix),
  index('oauth_access_tokens_refresh_prefix_idx').on(table.refreshTokenPrefix),
]);

export const agentActivity = pgTable('agent_activity', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tokenId:     text('token_id').notNull().references(() => agentTokens.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull(),
  tool:        text('tool').notNull(),
  targetType:  text('target_type'),
  targetId:    text('target_id'),
  status:      text('status', { enum: ['success', 'error'] }).notNull(),
  createdAt:   timestamp('created_at').notNull(),
}, (table) => [
  index('agent_activity_workspace_id_idx').on(table.workspaceId),
  index('agent_activity_token_id_idx').on(table.tokenId),
]);

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const subscriptions = pgTable('subscriptions', {
  ownerUserId:          text('owner_user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  tier:                 text('tier').notNull().default('free'),
  status:               text('status').notNull().default('active'),
  stripeCustomerId:     text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodEnd:     timestamp('current_period_end'),
  seatLimitOverride:    integer('seat_limit_override'),
  agentLimitOverride:   integer('agent_limit_override'),
  storageBytesOverride: integer('storage_bytes_override'),
  createdAt:            timestamp('created_at').notNull(),
  updatedAt:            timestamp('updated_at').notNull(),
}, (table) => [
  index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId),
]);
