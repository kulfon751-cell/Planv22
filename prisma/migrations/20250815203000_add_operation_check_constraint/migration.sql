-- Migration number: 20250815203000
-- Please place your SQL migration steps here.

-- Add a CHECK constraint to the "Operation" table
-- This ensures that the end timestamp is always after the start timestamp.
ALTER TABLE "Operation"
ADD CONSTRAINT "operation_end_ts_after_start_ts"
CHECK ("endTs" > "startTs");
