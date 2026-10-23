CREATE TABLE `error_reports` (
	`id` integer PRIMARY KEY NOT NULL,
	`at` integer NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL,
	`stack` text,
	`path` text,
	`version` text
);
