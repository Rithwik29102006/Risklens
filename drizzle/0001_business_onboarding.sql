CREATE TABLE IF NOT EXISTS `onboarding_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`org_name` text NOT NULL,
	`step` integer NOT NULL,
	`state_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
