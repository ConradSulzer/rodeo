CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`ts` integer NOT NULL,
	`player_id` text NOT NULL,
	`scoreable_id` text NOT NULL,
	`prior_event_id` text,
	`note` text,
	`value` real,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scoreable_id`) REFERENCES `scoreable`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prior_event_id`) REFERENCES `event`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `event_player_scoreable_ts` ON `event` (`player_id`,`scoreable_id`,`ts`);--> statement-breakpoint
CREATE INDEX `event_prior` ON `event` (`prior_event_id`);--> statement-breakpoint
CREATE TABLE `player` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scoreable` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_scoreable_label` ON `scoreable` (`label`);