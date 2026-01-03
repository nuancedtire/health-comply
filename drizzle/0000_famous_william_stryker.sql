CREATE TABLE `action_evidence_links` (
	`id` text PRIMARY KEY NOT NULL,
	`action_id` text,
	`evidence_item_id` text,
	`linked_at` integer DEFAULT (strftime('%s', 'now')),
	`linked_by` text,
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_item_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`gap_id` text,
	`quality_statement_id` text,
	`practice_id` text,
	`title` text NOT NULL,
	`description` text,
	`owner_user_id` text,
	`due_date` integer,
	`status` text NOT NULL,
	`priority` text,
	`completed_at` integer,
	`completed_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`gap_id`) REFERENCES `gaps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quality_statement_id`) REFERENCES `quality_statements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_evidence_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_item_id` text,
	`suggested_type` text,
	`suggested_statements` text,
	`suggested_category` text,
	`suggested_summary` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`evidence_item_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_trail` (
	`id` text PRIMARY KEY NOT NULL,
	`practice_id` text,
	`user_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event` text NOT NULL,
	`change_type` text,
	`before_state` text,
	`after_state` text,
	`timestamp` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `evidence_item_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_item_id` text,
	`quality_statement_id` text,
	`evidence_category_id` text,
	`free_tags` text,
	`why_it_supports` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`created_by` text,
	FOREIGN KEY (`evidence_item_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quality_statement_id`) REFERENCES `quality_statements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_category_id`) REFERENCES `evidence_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`practice_id` text,
	`title` text NOT NULL,
	`description` text,
	`owner_user_id` text,
	`evidence_date` integer NOT NULL,
	`review_due_date` integer,
	`status` text NOT NULL,
	`confidentiality_level` text DEFAULT 'internal',
	`evidence_type` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`created_by` text,
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_item_id` text,
	`version_number` integer NOT NULL,
	`source_type` text NOT NULL,
	`r2_bucket` text,
	`r2_object_key` text,
	`external_url` text,
	`file_name` text,
	`file_size` integer,
	`mime_type` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`evidence_item_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gaps` (
	`id` text PRIMARY KEY NOT NULL,
	`quality_statement_id` text,
	`practice_id` text,
	`title` text NOT NULL,
	`description` text,
	`severity` text,
	`status` text NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`quality_statement_id`) REFERENCES `quality_statements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `key_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`short_name` text NOT NULL,
	`full_question` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`resource` text NOT NULL,
	`action` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `policy_acknowledgements` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_version_id` text,
	`user_id` text,
	`acknowledged_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`policy_version_id`) REFERENCES `policy_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `policy_library` (
	`id` text PRIMARY KEY NOT NULL,
	`practice_id` text,
	`topic` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `policy_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text,
	`version_number` integer NOT NULL,
	`content` text,
	`status` text NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`policy_id`) REFERENCES `policy_library`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `practices` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `quality_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`key_question_id` text,
	`statement_number` integer NOT NULL,
	`statement_text` text NOT NULL,
	`description` text,
	`regulation_links` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`key_question_id`) REFERENCES `key_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text,
	`permission_id` text,
	`granted_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`practice_id` text,
	`name` text NOT NULL,
	`description` text,
	`is_default` integer DEFAULT false,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `statement_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`quality_statement_id` text,
	`practice_id` text,
	`assessment_text` text,
	`assessment_score` text,
	`assessed_by` text,
	`assessed_at` integer,
	`is_latest` integer DEFAULT true,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`quality_statement_id`) REFERENCES `quality_statements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`practice_id` text,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`role_id` text,
	`password_hash` text,
	`is_active` integer DEFAULT true,
	`last_login` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
