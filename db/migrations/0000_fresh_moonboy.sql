CREATE TABLE IF NOT EXISTS "flashcards" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"definition_id" integer,
	"learned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "parent_student" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_email" text NOT NULL,
	"student_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"list_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"score" integer,
	"submitted_at" timestamp,
	"graded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "vocabulary_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"passage" text NOT NULL,
	"educator_id" integer NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "vocabulary_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	"list_id" integer NOT NULL,
	"definition" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "word_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"student_definition" text NOT NULL,
	"is_correct" boolean,
	"added_to_flashcards" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_session_expire" ON "sessions" ("expire");

DO $$ BEGIN
 ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_word_id_vocabulary_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "vocabulary_words"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_definition_id_word_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "word_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "parent_student" ADD CONSTRAINT "parent_student_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_list_id_vocabulary_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "vocabulary_lists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "vocabulary_lists" ADD CONSTRAINT "vocabulary_lists_educator_id_users_id_fk" FOREIGN KEY ("educator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "vocabulary_words" ADD CONSTRAINT "vocabulary_words_list_id_vocabulary_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "vocabulary_lists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "word_definitions" ADD CONSTRAINT "word_definitions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "word_definitions" ADD CONSTRAINT "word_definitions_word_id_vocabulary_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "vocabulary_words"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
