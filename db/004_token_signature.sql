-- Owner signature over the permission, used by the first sale to approve it on chain when the
-- wallet returned a signed but not yet approved permission.
alter table tokens add column if not exists signature text;
