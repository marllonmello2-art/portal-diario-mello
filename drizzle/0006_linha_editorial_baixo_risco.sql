-- Fase 5: linha editorial de baixo risco e ciclo de vida do conteúdo. Aditiva.

ALTER TABLE `articles` ADD `content_type` text DEFAULT 'PERMANENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `review_due_at` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `last_reviewed_at` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `event_date` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `expires_at` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `risk_source_ok` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `risk_no_person_ok` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `risk_no_advice_ok` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `risk_image_ok` integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Editorias da nova linha. As antigas saem pelo bootstrap, que desvincula as
-- matérias antes de apagar a editoria — nenhum texto é perdido.
INSERT OR IGNORE INTO `categories` (`id`, `name`, `slug`, `color`, `position`) VALUES
  (lower(hex(randomblob(16))), 'Cultura e história', 'cultura-e-historia', '#8b3fbf', 0),
  (lower(hex(randomblob(16))), 'Tecnologia prática', 'tecnologia-pratica', '#2b2f77', 1),
  (lower(hex(randomblob(16))), 'Educação e explicação', 'educacao-e-explicacao', '#0b6e4f', 2),
  (lower(hex(randomblob(16))), 'Serviço', 'servico', '#0f7c8c', 3),
  (lower(hex(randomblob(16))), 'Agenda cultural', 'agenda-cultural', '#b5651d', 4),
  (lower(hex(randomblob(16))), 'Esporte informativo', 'esporte-informativo', '#1b5fc1', 5);
