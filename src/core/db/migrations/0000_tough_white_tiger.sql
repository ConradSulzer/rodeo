CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`direction` text NOT NULL,
	`show_scoreables_count` integer DEFAULT false NOT NULL,
	`scoreables_count_name` text DEFAULT '' NOT NULL,
	`rules` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_category_name` ON `category` (`name`);--> statement-breakpoint
CREATE TABLE `category_scoreable` (
	`category_id` text NOT NULL,
	`scoreable_id` text NOT NULL,
	PRIMARY KEY(`category_id`, `scoreable_id`),
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`scoreable_id`) REFERENCES `scoreable`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `category_scoreable_scoreable` ON `category_scoreable` (`scoreable_id`);--> statement-breakpoint
CREATE TABLE `division` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_division_name` ON `division` (`name`);--> statement-breakpoint
CREATE TABLE `division_category` (
	`division_id` text NOT NULL,
	`category_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`depth` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`division_id`, `category_id`),
	FOREIGN KEY (`division_id`) REFERENCES `division`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `division_category_category` ON `division_category` (`category_id`);--> statement-breakpoint
CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`ts` integer NOT NULL,
	`player_id` text NOT NULL,
	`scoreable_id` text NOT NULL,
	`scoreable_name` text DEFAULT '' NOT NULL,
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
	`email` text NOT NULL,
	`cell_phone` text,
	`emergency_contact` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_email_first_last` ON `player` (`email`,`first_name`,`last_name`);--> statement-breakpoint
CREATE TABLE `player_division` (
	`player_id` text NOT NULL,
	`division_id` text NOT NULL,
	PRIMARY KEY(`player_id`, `division_id`),
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`division_id`) REFERENCES `division`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `player_division_division` ON `player_division` (`division_id`);--> statement-breakpoint
CREATE INDEX `player_division_player` ON `player_division` (`player_id`);--> statement-breakpoint
CREATE TABLE `scoreable` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_scoreable_label` ON `scoreable` (`label`);--> statement-breakpoint
CREATE TABLE `tournament` (
	`id` text PRIMARY KEY DEFAULT 'meta' NOT NULL,
	`name` text DEFAULT 'Untitled Tournament' NOT NULL,
	`event_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
