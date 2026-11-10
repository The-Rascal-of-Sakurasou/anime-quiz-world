-- Guarantee that the private owner allowlist can contain at most one account.
create unique index if not exists site_admins_single_owner_idx
  on private.site_admins ((true));
