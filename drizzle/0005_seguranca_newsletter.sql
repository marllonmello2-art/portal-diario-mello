-- Fase 4: consentimento do boletim. Aditiva.

ALTER TABLE `newsletter_subscribers` ADD `purpose` text DEFAULT 'Boletim diário do Diário Mello' NOT NULL;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD `status` text DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD `token` text;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD `confirmed_at` text;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD `unsubscribed_at` text;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD `ip` text;
