-- Fase 2: apuração e fontes, classificação obrigatória e direitos de imagem.
-- Aditiva: nenhuma tabela é recriada, nenhuma matéria é tocada.

CREATE TABLE IF NOT EXISTS `article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'outro' NOT NULL,
	`reference` text,
	`consulted_at` text,
	`status` text DEFAULT 'pendente' NOT NULL,
	`note` text,
	`confidential` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `article_sources_article_idx` ON `article_sources` (`article_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`url` text NOT NULL,
	`mime` text,
	`bytes` integer,
	`credit` text,
	`source` text,
	`license` text,
	`obtained_at` text,
	`usage_note` text,
	`ai_generated` integer DEFAULT 0 NOT NULL,
	`uploaded_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

-- Matérias que já existiam nascem como NOTICIA; o editor reclassifica quando precisar.
ALTER TABLE `articles` ADD `classification` text DEFAULT 'NOTICIA' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `cover_source` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `cover_license` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `cover_obtained_at` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `cover_usage_note` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `cover_ai_generated` integer DEFAULT 0 NOT NULL;
