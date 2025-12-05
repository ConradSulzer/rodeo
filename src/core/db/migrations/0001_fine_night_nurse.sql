CREATE TABLE `podium_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`ts` integer NOT NULL,
	`division_id` text NOT NULL,
	`category_id` text NOT NULL,
	`player_id` text NOT NULL,
	`payload` text DEFAULT 'null',
	FOREIGN KEY (`division_id`) REFERENCES `division`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `podium_event_division_category` ON `podium_event` (`division_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `podium_event_player` ON `podium_event` (`player_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_division_category` (
	`division_id` text NOT NULL,
	`category_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`depth` integer DEFAULT 10 NOT NULL,
	PRIMARY KEY(`division_id`, `category_id`),
	FOREIGN KEY (`division_id`) REFERENCES `division`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_division_category`("division_id", "category_id", "order", "depth") SELECT "division_id", "category_id", "order", "depth" FROM `division_category`;--> statement-breakpoint
DROP TABLE `division_category`;--> statement-breakpoint
ALTER TABLE `__new_division_category` RENAME TO `division_category`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `division_category_category` ON `division_category` (`category_id`);