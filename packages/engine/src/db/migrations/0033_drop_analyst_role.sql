UPDATE auth_member SET role = 'viewer' WHERE role = 'analyst';
ALTER TABLE auth_member DROP CONSTRAINT IF EXISTS auth_member_role_check;
ALTER TABLE auth_member ADD CONSTRAINT auth_member_role_check CHECK (role IN ('owner', 'admin', 'viewer'));
