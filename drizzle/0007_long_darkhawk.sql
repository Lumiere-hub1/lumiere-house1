CREATE TABLE `connector_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`provider` varchar(120) NOT NULL,
	`externalAccountId` varchar(255),
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`accessTokenExpiresAt` timestamp,
	`refreshTokenExpiresAt` timestamp,
	`scopes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connector_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `connector_credentials_workspace_provider_idx` UNIQUE(`workspaceId`,`provider`)
);
--> statement-breakpoint
ALTER TABLE `connector_credentials` ADD CONSTRAINT `connector_credentials_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;