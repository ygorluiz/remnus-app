CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workspace_items` ADD COLUMN `workspace_id` text REFERENCES `workspaces`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
INSERT INTO `workspaces` (`id`, `name`) VALUES ('default-workspace', 'My Workspace');
--> statement-breakpoint
UPDATE `workspace_items` SET `workspace_id` = 'default-workspace' WHERE `workspace_id` IS NULL;
