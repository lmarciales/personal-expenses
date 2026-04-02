-- Add is_archived column to support CDT lifecycle (hide redeemed CDTs)
ALTER TABLE accounts ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
