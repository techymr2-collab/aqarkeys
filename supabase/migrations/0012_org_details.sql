-- Extend organizations with agency contact details.
-- All nullable so existing rows are unaffected.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS phone    text,
  ADD COLUMN IF NOT EXISTS email    text,
  ADD COLUMN IF NOT EXISTS website  text,
  ADD COLUMN IF NOT EXISTS address  text,
  ADD COLUMN IF NOT EXISTS trn      text;
