CREATE TABLE `daily_stats` (
	`day` text PRIMARY KEY NOT NULL,
	`player_joins` integer DEFAULT 0 NOT NULL,
	`actions` integer DEFAULT 0 NOT NULL
);
