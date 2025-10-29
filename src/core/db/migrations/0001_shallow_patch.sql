CREATE TABLE `player_division` (
	`player_id` text NOT NULL,
	`division_id` text NOT NULL,
	PRIMARY KEY(`player_id`, `division_id`),
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`division_id`) REFERENCES `division`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `player_division_division` ON `player_division` (`division_id`);--> statement-breakpoint
CREATE INDEX `player_division_player` ON `player_division` (`player_id`);