-- Trigger entry points need no direct execution by API roles.
revoke all on function orbit_private.keepsake_revision(),orbit_private.invalidate_keepsake_copies() from public,anon,authenticated;
