CREATE TABLE `rate_limit_buckets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bucketKey` varchar(255) NOT NULL,
	`windowStart` timestamp NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_limit_buckets_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limit_bucket_key_idx` UNIQUE(`bucketKey`)
);
--> statement-breakpoint
CREATE TABLE `webhook_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(120) NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`signatureHash` varchar(128) NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`status` enum('received','duplicate','blocked') NOT NULL DEFAULT 'received',
	`metadata` json,
	CONSTRAINT `webhook_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_provider_event_idx` UNIQUE(`provider`,`eventId`)
);
--> statement-breakpoint
CREATE INDEX `webhook_expires_idx` ON `webhook_receipts` (`expiresAt`);