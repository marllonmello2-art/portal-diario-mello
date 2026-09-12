-- Governança editorial (fase 1).
--
-- Escrita à mão, no lugar da recriação de tabela que o drizzle-kit gera para
-- mudança de DEFAULT: aqui as matérias existentes permanecem onde estão, e a
-- migração roda igual num banco novo ou num banco já em produção.

CREATE TABLE IF NOT EXISTS `admin_user_roles` (
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `role`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`actor_kind` text DEFAULT 'usuario' NOT NULL,
	`actor_id` text,
	`actor_label` text,
	`action` text NOT NULL,
	`entity` text,
	`entity_id` text,
	`from_status` text,
	`to_status` text,
	`note` text,
	`metadata` text,
	`ip` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_log_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_log_entity_idx` ON `audit_log` (`entity`, `entity_id`);--> statement-breakpoint

ALTER TABLE `articles` ADD `created_by_user_id` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `origin` text DEFAULT 'painel' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `ai_assisted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `approved_by_user_id` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `published_by_user_id` text;--> statement-breakpoint

-- Vocabulário editorial: só o rótulo do estado muda, nenhuma matéria é tocada.
UPDATE `articles` SET `status` = 'RASCUNHO' WHERE `status` = 'draft';--> statement-breakpoint
UPDATE `articles` SET `status` = 'PUBLICADA' WHERE `status` = 'published';--> statement-breakpoint
UPDATE `articles` SET `status` = 'AGENDADA' WHERE `status` = 'scheduled';--> statement-breakpoint

-- Quem era `admin` vira editor-chefe e administrador; `editor` vira EDITOR.
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`)
	SELECT `id`, 'EDITOR_CHEFE' FROM `admin_users` WHERE `role` <> 'editor';--> statement-breakpoint
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`)
	SELECT `id`, 'ADMINISTRADOR' FROM `admin_users` WHERE `role` <> 'editor';--> statement-breakpoint
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`)
	SELECT `id`, 'EDITOR' FROM `admin_users` WHERE `role` = 'editor';
