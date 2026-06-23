-- =============================================================
-- Organization ID — switch from sequential to random
--
--   0020 made org_number a sequential counter (ORG-000001, ...).
--   This replaces it with a random 6-character code (ORG-7F3K2A)
--   so the ID doesn't reveal signup order or agency count.
--
--   Uniqueness is guaranteed by generate_org_code(): it loops,
--   drawing from a 32-character alphabet that excludes visually
--   ambiguous characters (0/O, 1/I, L), and only returns a code once
--   it has checked no existing organization already has it. A unique
--   index is kept as a hard backstop against any race.
--
--   The generator is wired as the column default, so every new
--   organization row — i.e. every agency signup via handle_new_user
--   in 0004_signup.sql — gets a code automatically. No application
--   changes needed.
-- =============================================================

create or replace function generate_org_code()
returns text
language plpgsql
as $$
declare
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; -- no 0/O, 1/I, L
  v_code     text;
  v_taken    boolean;
begin
  loop
    v_code := 'ORG-';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, (floor(random() * length(v_alphabet)) + 1)::int, 1);
    end loop;
    select exists(select 1 from organizations where org_code = v_code) into v_taken;
    exit when not v_taken;
  end loop;
  return v_code;
end;
$$;

alter table organizations
  add column if not exists org_code text;

update organizations set org_code = generate_org_code() where org_code is null;

alter table organizations
  alter column org_code set default generate_org_code(),
  alter column org_code set not null;

create unique index if not exists organizations_org_code_idx on organizations(org_code);

-- Retire the sequential identifier from 0020 (the owned sequence is
-- dropped automatically along with the column).
alter table organizations drop column if exists org_number;
drop sequence if exists organizations_org_number_seq;
