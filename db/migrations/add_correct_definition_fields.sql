-- Add correct_definition and show_correct_definition fields to word_definitions table
ALTER TABLE word_definitions
    ADD COLUMN IF NOT EXISTS correct_definition TEXT,
    ADD COLUMN IF NOT EXISTS show_correct_definition BOOLEAN DEFAULT TRUE NOT NULL;
