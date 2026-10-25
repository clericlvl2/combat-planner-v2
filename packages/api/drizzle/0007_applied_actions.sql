CREATE TABLE `applied_actions` (
	`combatId` text NOT NULL,
	`seq` integer NOT NULL,
	`actionId` text NOT NULL,
	PRIMARY KEY(`combatId`, `actionId`),
	FOREIGN KEY (`combatId`) REFERENCES `combats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `applied_actions_combatId_seq_idx` ON `applied_actions` (`combatId`,`seq`);--> statement-breakpoint
INSERT INTO `applied_actions` (`combatId`, `seq`, `actionId`) SELECT `combatId`, `seq`, `actionId` FROM `action_log`;
