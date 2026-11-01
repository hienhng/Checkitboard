-- Checkit: initial PostgreSQL schema.
-- Generated from shared/schema.ts. Run in a new database.
-- Creates tables only; does not insert sample accounts or upgrade existing tables.

BEGIN;
SET LOCAL search_path TO public;

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "password" text NOT NULL,
  "role" text NOT NULL,
  "name" text NOT NULL,
  "profile_picture" text,
  "email_verified" boolean NOT NULL DEFAULT false,
  "email_verification_token" text,
  "email_verification_expires" timestamp,
  "password_reset_token" text,
  "password_reset_expires" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "users_email_unique" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "classes" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "class_code" text NOT NULL,
  "educator_id" integer NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "classes_class_code_unique" UNIQUE ("class_code"),
  CONSTRAINT "classes_educator_id_users_id_fk" FOREIGN KEY ("educator_id") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "educator_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "educator_id" integer NOT NULL,
  "email_notifications" boolean NOT NULL DEFAULT true,
  "auto_approve_requests" boolean NOT NULL DEFAULT false,
  "allow_student_self_enroll" boolean NOT NULL DEFAULT true,
  "default_due_date" integer NOT NULL DEFAULT 7,
  "grade_visibility" text NOT NULL DEFAULT 'immediate',
  "allow_redos" boolean NOT NULL DEFAULT true,
  "max_redo_attempts" integer NOT NULL DEFAULT 3,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "educator_settings_educator_id_unique" UNIQUE ("educator_id"),
  CONSTRAINT "educator_settings_educator_id_users_id_fk" FOREIGN KEY ("educator_id") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "category" text NOT NULL,
  "related_id" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "parent_student" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_email" text NOT NULL,
  "student_id" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "parent_student_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "sticky_notes" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL,
  "word" text NOT NULL,
  "definition" text NOT NULL,
  "example" text,
  "category" text NOT NULL,
  "difficulty" text NOT NULL,
  "user_notes" text,
  "emoji" text DEFAULT '📝',
  "color" text DEFAULT 'yellow',
  "position_x" integer DEFAULT 0,
  "position_y" integer DEFAULT 0,
  "is_learned" boolean NOT NULL DEFAULT false,
  "is_custom" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "sticky_notes_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "student_class" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL,
  "class_id" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "student_class_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users" ("id"),
  CONSTRAINT "student_class_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "classes" ("id")
);

CREATE TABLE IF NOT EXISTS "vocabulary_lists" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "passage" text NOT NULL,
  "educator_id" integer NOT NULL,
  "class_id" integer,
  "published" boolean NOT NULL DEFAULT false,
  "type" text NOT NULL DEFAULT 'practice',
  "due_date" timestamp,
  "grade_visibility" text NOT NULL DEFAULT 'immediate',
  "grades_released" boolean NOT NULL DEFAULT false,
  "time_limit" integer,
  "shuffle_questions" boolean NOT NULL DEFAULT false,
  "show_correct_answers" boolean NOT NULL DEFAULT true,
  "allow_redos" boolean NOT NULL DEFAULT true,
  "max_redo_attempts" integer NOT NULL DEFAULT 3,
  "parent_list_id" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "vocabulary_lists_educator_id_users_id_fk" FOREIGN KEY ("educator_id") REFERENCES "users" ("id"),
  CONSTRAINT "vocabulary_lists_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "classes" ("id"),
  CONSTRAINT "vocabulary_lists_parent_list_id_vocabulary_lists_id_fk" FOREIGN KEY ("parent_list_id") REFERENCES "vocabulary_lists" ("id")
);

CREATE TABLE IF NOT EXISTS "submissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL,
  "list_id" integer NOT NULL,
  "completed" boolean NOT NULL DEFAULT false,
  "score" integer,
  "submitted_at" timestamp,
  "graded_at" timestamp,
  "is_redo" boolean NOT NULL DEFAULT false,
  "is_discarded" boolean NOT NULL DEFAULT false,
  "discard_reason" text,
  "exit_reason" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users" ("id"),
  CONSTRAINT "submissions_list_id_vocabulary_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "vocabulary_lists" ("id")
);

CREATE TABLE IF NOT EXISTS "vocabulary_words" (
  "id" serial PRIMARY KEY NOT NULL,
  "word" text NOT NULL,
  "list_id" integer NOT NULL,
  "definition" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "vocabulary_words_list_id_vocabulary_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "vocabulary_lists" ("id")
);

CREATE TABLE IF NOT EXISTS "fullscreen_exits" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "timestamp" timestamp NOT NULL DEFAULT now(),
  "user_agent" text,
  CONSTRAINT "fullscreen_exits_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id")
);

CREATE TABLE IF NOT EXISTS "input_form_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "word_id" integer NOT NULL,
  "question" text NOT NULL,
  "correct_answer" text NOT NULL,
  "case_sensitive" boolean NOT NULL DEFAULT false,
  "show_answer" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "input_form_questions_word_id_vocabulary_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "vocabulary_words" ("id")
);

CREATE TABLE IF NOT EXISTS "multiple_choice_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "word_id" integer NOT NULL,
  "question" text NOT NULL,
  "correct_answer" text NOT NULL,
  "option_a" text NOT NULL,
  "option_b" text NOT NULL,
  "option_c" text NOT NULL,
  "option_d" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "multiple_choice_questions_word_id_vocabulary_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "vocabulary_words" ("id")
);

CREATE TABLE IF NOT EXISTS "word_definitions" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "word_id" integer NOT NULL,
  "student_definition" text,
  "correct_definition" text,
  "show_correct_definition" boolean NOT NULL DEFAULT true,
  "is_correct" boolean,
  "added_to_flashcards" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "word_definitions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id"),
  CONSTRAINT "word_definitions_word_id_vocabulary_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "vocabulary_words" ("id")
);

CREATE TABLE IF NOT EXISTS "flashcards" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL,
  "word_id" integer NOT NULL,
  "definition_id" integer,
  "learned" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "flashcards_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users" ("id"),
  CONSTRAINT "flashcards_word_id_vocabulary_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "vocabulary_words" ("id"),
  CONSTRAINT "flashcards_definition_id_word_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "word_definitions" ("id")
);

CREATE TABLE IF NOT EXISTS "input_form_answers" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "question_id" integer NOT NULL,
  "student_answer" text NOT NULL,
  "is_correct" boolean NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "input_form_answers_submission_id_question_id_unique" UNIQUE ("submission_id", "question_id"),
  CONSTRAINT "input_form_answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id"),
  CONSTRAINT "input_form_answers_question_id_input_form_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "input_form_questions" ("id")
);

CREATE TABLE IF NOT EXISTS "multiple_choice_answers" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "question_id" integer NOT NULL,
  "selected_answer" text NOT NULL,
  "is_correct" boolean NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "multiple_choice_answers_submission_id_question_id_unique" UNIQUE ("submission_id", "question_id"),
  CONSTRAINT "multiple_choice_answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id"),
  CONSTRAINT "multiple_choice_answers_question_id_multiple_choice_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "multiple_choice_questions" ("id")
);

-- Login session storage (connect-pg-simple).
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

COMMIT;
