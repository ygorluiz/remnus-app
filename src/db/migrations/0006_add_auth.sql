-- Migration 0006: Add auth tables and workspace membership
-- Next-auth v5 (Auth.js) tables + workspace_members for access control

CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text,
  `email` text UNIQUE,
  `emailVerified` integer,
  `image` text,
  `role` text NOT NULL DEFAULT 'user',
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint

CREATE TABLE `account` (
  `userId` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `type` text NOT NULL,
  `provider` text NOT NULL,
  `providerAccountId` text NOT NULL,
  `refresh_token` text,
  `access_token` text,
  `expires_at` integer,
  `token_type` text,
  `scope` text,
  `id_token` text,
  `session_state` text,
  PRIMARY KEY (`provider`, `providerAccountId`)
);
--> statement-breakpoint

CREATE TABLE `session` (
  `sessionToken` text PRIMARY KEY NOT NULL,
  `userId` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `expires` integer NOT NULL
);
--> statement-breakpoint

CREATE TABLE `verificationToken` (
  `identifier` text NOT NULL,
  `token` text NOT NULL,
  `expires` integer NOT NULL,
  PRIMARY KEY (`identifier`, `token`)
);
--> statement-breakpoint

CREATE TABLE `workspace_members` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `role` text NOT NULL DEFAULT 'member',
  `created_at` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`workspace_id`, `user_id`)
);
