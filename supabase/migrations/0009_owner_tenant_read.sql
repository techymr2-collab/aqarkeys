-- Allow owners to read tenants whose leases sit in their properties.
-- Without this, the owner statements page can't resolve tenant names via joins.
create policy tenants_owner_read on tenants
  for select using (
    id in (
      select l.tenant_id
      from leases l
      join units u on u.id = l.unit_id
      join properties p on p.id = u.property_id
      where p.owner_id = current_owner_id()
    )
  );
