CREATE TABLE `reader_saved_articles` (
	`reader_id` text NOT NULL,
	`article_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`reader_id`, `article_id`),
	FOREIGN KEY (`reader_id`) REFERENCES `readers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `readers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_login_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `readers_email_unique` ON `readers` (`email`);--> statement-breakpoint
ALTER TABLE `articles` ADD `access_level` text DEFAULT 'public' NOT NULL;