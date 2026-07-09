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

// ── Auth tables (Better Auth generated schema) ──────────────────────────────

export const users = pgTable('user', {
  id:                text('id').primaryKey(),
  name:              text('name').notNull(),
  email:             text('email').notNull().unique(),
  emailVerified:     boolean('email_verified').default(false).notNull(),
  image:             text('image'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  role:              text('role').default('user').notNull(),
  analyticsConsent:  text('analytics_consent'),
  passwordHash:      text('password_hash'),
  emailUnsubscribedAt: timestamp('email_unsubscribed_at'),
  emailSuppressed:     boolean('email_suppressed').default(false),
});

export const sessions = pgTable('session', {
  id:        text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index('session_user_id_idx').on(table.userId),
]);

export const accounts = pgTable('account', {
  id:                     text('id').primaryKey(),
  accountId:              text('account_id').notNull(),
  providerId:             text('provider_id').notNull(),
  userId:                 text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken:            text('access_token'),
  refreshToken:           text('refresh_token'),
  idToken:                text('id_token'),
  accessTokenExpiresAt:   timestamp('access_token_expires_at'),
  refreshTokenExpiresAt:  timestamp('refresh_token_expires_at'),
  scope:                  text('scope'),
  password:               text('password'),
  createdAt:              timestamp('created_at').defaultNow().notNull(),
  updatedAt:              timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index('account_user_id_idx').on(table.userId),
]);

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index('verification_identifier_idx').on(table.identifier),
]);

export const jwks = pgTable('jwks', {
  id:         text('id').primaryKey(),
  publicKey:  text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt:  timestamp('created_at').notNull(),
  expiresAt:  timestamp('expires_at'),
});

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
  platform: text('platform'),
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
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tokenId:       text('token_id').references(() => agentTokens.id, { onDelete: 'cascade' }),
  oauthTokenId:  text('oauth_token_id').references(() => oauthAccessTokens.id, { onDelete: 'set null' }),
  ownerUserId:   text('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  workspaceId:   text('workspace_id').notNull(),
  tool:          text('tool').notNull(),
  targetType:    text('target_type'),
  targetId:      text('target_id'),
  status:        text('status', { enum: ['success', 'error'] }).notNull(),
  responseBytes: integer('response_bytes'),
  createdAt:     timestamp('created_at').notNull(),
}, (table) => [
  index('agent_activity_workspace_id_idx').on(table.workspaceId),
  index('agent_activity_token_id_idx').on(table.tokenId),
  index('agent_activity_owner_created_idx').on(table.ownerUserId, table.createdAt),
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

// ── Demo feedback ─────────────────────────────────────────────────────────────

export const demoFeedback = pgTable('demo_feedback', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').references(() => users.id, { onDelete: 'set null' }),
  sentiment: text('sentiment').notNull(),
  comment:   text('comment'),
  createdAt: timestamp('created_at').notNull(),
}, (table) => [
  index('demo_feedback_created_at_idx').on(table.createdAt),
]);

// ── Email campaigns ─────────────────────────────────────────────────────────

export const emailCampaigns = pgTable('email_campaigns', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id'),
  createdBy:  text('created_by').references(() => users.id, { onDelete: 'set null' }),
  subject:    text('subject').notNull(),
  preheader:  text('preheader'),
  body:       text('body').notNull(),
  status:     text('status').notNull().default('draft'),
  sentAt:     timestamp('sent_at'),
  createdAt:  timestamp('created_at').notNull(),
});

// ── Email log ────────────────────────────────────────────────────────────────

export const emailLog = pgTable('email_log', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text('campaign_id').references(() => emailCampaigns.id, { onDelete: 'set null' }),
  userId:     text('user_id').references(() => users.id, { onDelete: 'set null' }),
  kind:       text('kind').notNull(),
  subject:    text('subject'),
  status:     text('status').notNull(),
  error:      text('error'),
  createdAt:  timestamp('created_at').notNull(),
}, (table) => [
  index('email_log_user_kind_idx').on(table.userId, table.kind),
  index('email_log_created_at_idx').on(table.createdAt),
  index('email_log_campaign_id_idx').on(table.campaignId),
]);

// ── Page links ───────────────────────────────────────────────────────────────

export const pageLinks = pgTable('page_links', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourcePageId:  text('source_page_id').notNull(),
  targetPageId:  text('target_page_id').notNull(),
  workspaceId:   text('workspace_id').notNull(),
  strength:      integer('strength').notNull(),
  createdAt:     timestamp('created_at').notNull(),
}, (table) => [
  index('page_links_source_idx').on(table.sourcePageId),
  index('page_links_target_idx').on(table.targetPageId),
]);

// ── Deleted items ───────────────────────────────────────────────────────────

export const deletedItems = pgTable('deleted_items', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull(),
  itemType:    text('item_type').notNull(),
  itemId:      text('item_id').notNull(),
  deletedAt:   timestamp('deleted_at').notNull(),
}, (table) => [
  index('deleted_items_workspace_deleted_idx').on(table.workspaceId, table.deletedAt),
]);

// ── Account deletion tokens ─────────────────────────────────────────────────

export const accountDeletionTokens = pgTable('account_deletion_tokens', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => [
  index('account_deletion_tokens_user_id_idx').on(table.userId),
]);

// ── Finance module tables ─────────────────────────────────────────────────────
// Imported at bottom so core tables (workspaces, users) are fully defined
// before finance modules reference them.
export * from './finance';
