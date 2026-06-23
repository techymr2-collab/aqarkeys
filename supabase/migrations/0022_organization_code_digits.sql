-- =============================================================
-- Organization ID — guarantee digits are mixed into the code
--
--   generate_org_code() previously drew all 6 characters uniformly
--   from a combined letter+digit alphabet, which could (and did, for
--   all 3 existing orgs) produce an all-letter result by chance
--   (~20% odds). This guarantees every code visibly mixes letters
--   and digits: exactly 2 of the 6 characters are digits, placed at
--   random positions, never a fixed/predictable slot.
-- =============================================================

create or replace function generate_org_code()
returns text
language plpgsql
as $$
declare
  v_letters   text := 'ABCDEFGHJKMNPQRSTUVWXYZ'; -- no O, I, L
  v_digits    text := '23456789';                -- no 0, 1
  v_digit_pos int[];
  v_chars     text[] := array['','','','','',''];
  v_code      text;
  v_taken     boolean;
  v_pos       int;
begin
  loop
    -- pick 2 distinct positions (of 6) to hold digits
    v_digit_pos := array[]::int[];
    while array_length(v_digit_pos, 1) is null or array_length(v_digit_pos, 1) < 2 loop
      v_pos := (floor(random() * 6) + 1)::int;
      if not (v_pos = any(v_digit_pos)) then
        v_digit_pos := array_append(v_digit_pos, v_pos);
      end if;
    end loop;

    for v_pos in 1..6 loop
      if v_pos = any(v_digit_pos) then
        v_chars[v_pos] := substr(v_digits, (floor(random() * length(v_digits)) + 1)::int, 1);
      else
        v_chars[v_pos] := substr(v_letters, (floor(random() * length(v_letters)) + 1)::int, 1);
      end if;
    end loop;

    v_code := 'ORG-' || array_to_string(v_chars, '');
    select exists(select 1 from organizations where org_code = v_code) into v_taken;
    exit when not v_taken;
  end loop;
  return v_code;
end;
$$;

-- Regenerate existing orgs' codes to the new guaranteed letters+digits
-- shape. Updated one row per statement (not one bulk UPDATE) so each
-- row's uniqueness check sees the previous row's freshly committed
-- code rather than a stale same-statement snapshot.
do $$
declare
  r record;
begin
  for r in select id from organizations loop
    update organizations set org_code = generate_org_code() where id = r.id;
  end loop;
end;
$$;
