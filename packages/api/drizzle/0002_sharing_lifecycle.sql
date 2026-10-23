ALTER TABLE `combats` ADD `linkShared` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `combats` ADD `orphanedAt` text;--> statement-breakpoint
ALTER TABLE `players` ADD `watchingSince` text;--> statement-breakpoint
UPDATE `combats` SET `linkShared` = true;
