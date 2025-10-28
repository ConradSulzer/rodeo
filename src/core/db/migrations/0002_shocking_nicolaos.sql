CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`direction` text NOT NULL,
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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_division_name` ON `division` (`name`);--> statement-breakpoint
CREATE TABLE `division_category` (
	`division_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`division_id`, `category_id`),
	FOREIGN KEY (`division_id`) REFERENCES `division`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `division_category_category` ON `division_category` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `player_email_first_last` ON `player` (`email`,`first_name`,`last_name`);