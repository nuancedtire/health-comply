CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`ai_model` text DEFAULT 'cerebras/zai-glm-4.7' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
