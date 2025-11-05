CREATE TABLE `tournament` (
	`id` text PRIMARY KEY DEFAULT 'meta' NOT NULL,
	`name` text DEFAULT 'Untitled Tournament' NOT NULL,
	`event_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
