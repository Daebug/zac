CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact` text,
	`address` text,
	`date_joined` text NOT NULL,
	`fee` real NOT NULL,
	`expiry_date` text NOT NULL,
	`notes` text,
	`gender` text,
	`birth_date` text,
	`category` text,
	`photo_uri` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`default_duration_months` integer DEFAULT 12 NOT NULL,
	`default_fee` real DEFAULT 500 NOT NULL,
	`expiry_warning_days` integer DEFAULT 30 NOT NULL,
	`updated_at` text NOT NULL,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`server_url` text,
	`email` text,
	`last_pulled_at` text,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`payment_mode` text,
	`notes` text,
	`member_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
