-- Add new columns to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_code TEXT NOT NULL UNIQUE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add status field to student_class relationship
ALTER TABLE student_class ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add class_id to vocabulary_lists
ALTER TABLE vocabulary_lists ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id);