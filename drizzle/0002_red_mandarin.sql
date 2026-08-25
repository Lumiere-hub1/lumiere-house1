CREATE TABLE `performance_import_rows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`value` int,
	`occurredAt` timestamp NOT NULL,
	`campaignId` int,
	`contentItemId` int,
	`metadata` json,
	`validationError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_import_rows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`source` varchar(120) NOT NULL,
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`status` enum('received','validated','blocked','applied') NOT NULL DEFAULT 'received',
	`rowCount` int NOT NULL DEFAULT 0,
	`acceptedCount` int NOT NULL DEFAULT 0,
	`rejectedCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`importedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`status` enum('queued','running','completed','blocked','failed') NOT NULL,
	`reason` text,
	`ranAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`scheduleType` enum('content','performance_import','automation_check') NOT NULL,
	`targetId` int,
	`runAt` timestamp NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`requiresApproval` boolean NOT NULL DEFAULT true,
	`enabled` boolean NOT NULL DEFAULT false,
	`status` enum('draft','scheduled','paused','completed','blocked') NOT NULL DEFAULT 'draft',
	`guardrailNote` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `performance_import_rows` ADD CONSTRAINT `performance_import_rows_importId_performance_imports_id_fk` FOREIGN KEY (`importId`) REFERENCES `performance_imports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_import_rows` ADD CONSTRAINT `performance_import_rows_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_import_rows` ADD CONSTRAINT `performance_import_rows_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_import_rows` ADD CONSTRAINT `performance_import_rows_contentItemId_content_items_id_fk` FOREIGN KEY (`contentItemId`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_imports` ADD CONSTRAINT `performance_imports_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_imports` ADD CONSTRAINT `performance_imports_importedByUserId_users_id_fk` FOREIGN KEY (`importedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedule_runs` ADD CONSTRAINT `schedule_runs_scheduleId_schedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `schedules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedule_runs` ADD CONSTRAINT `schedule_runs_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `performance_rows_workspace_occurred_idx` ON `performance_import_rows` (`workspaceId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `performance_imports_workspace_created_idx` ON `performance_imports` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `schedule_runs_workspace_ran_idx` ON `schedule_runs` (`workspaceId`,`ranAt`);--> statement-breakpoint
CREATE INDEX `schedules_workspace_run_idx` ON `schedules` (`workspaceId`,`runAt`,`status`);