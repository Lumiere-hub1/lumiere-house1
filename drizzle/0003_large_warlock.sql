CREATE TABLE `background_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`kind` varchar(120) NOT NULL,
	`payload` json,
	`status` enum('queued','running','completed','failed','blocked') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`availableAt` timestamp NOT NULL DEFAULT (now()),
	`lockedAt` timestamp,
	`completedAt` timestamp,
	`lastError` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `background_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stateHash` varchar(128) NOT NULL,
	`redirectUri` varchar(1000) NOT NULL,
	`provider` varchar(64) NOT NULL DEFAULT 'manus',
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_states_hash_idx` UNIQUE(`stateHash`)
);
--> statement-breakpoint
ALTER TABLE `background_jobs` ADD CONSTRAINT `background_jobs_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `background_jobs` ADD CONSTRAINT `background_jobs_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `background_jobs_queue_idx` ON `background_jobs` (`status`,`availableAt`);--> statement-breakpoint
CREATE INDEX `background_jobs_workspace_idx` ON `background_jobs` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `oauth_states_expires_idx` ON `oauth_states` (`expiresAt`);