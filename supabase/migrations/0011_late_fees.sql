-- Add late fee support to invoices.
-- late_fee stores a fixed AED penalty added on top of the base rent amount.
-- Defaults to 0 so all existing invoices are unaffected.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS late_fee numeric NOT NULL DEFAULT 0;
