-- Fase 3: correções, direito de resposta e limite de tentativas. Aditiva.

CREATE TABLE IF NOT EXISTS `correction_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol` text NOT NULL UNIQUE,
	`kind` text DEFAULT 'correcao' NOT NULL,
	`article_id` text,
	`article_url` text,
	`requester_name` text NOT NULL,
	`requester_email` text NOT NULL,
	`requester_role` text,
	`claim` text NOT NULL,
	`evidence` text,
	`status` text DEFAULT 'recebido' NOT NULL,
	`internal_note` text,
	`response` text,
	`handled_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`ip` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `correction_requests_status_idx` ON `correction_requests` (`status`, `created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`description` text NOT NULL,
	`corrected_by_user_id` text,
	`request_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `article_corrections_article_idx` ON `article_corrections` (`article_id`, `created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` text NOT NULL
);
