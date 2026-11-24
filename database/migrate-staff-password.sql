-- Staff sign in with email + password instead of MetaMask.
-- Run once against an existing database (fresh installs get this from
-- schema.sql + seed.sql). Staff keep their wallet_address: it now only
-- signs their on-chain actions.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_identity_check;
ALTER TABLE users ADD CONSTRAINT users_identity_check CHECK (
  (role = 'policyholder' AND password_hash IS NOT NULL AND holder_id IS NOT NULL AND wallet_address IS NULL)
  OR
  (role <> 'policyholder' AND wallet_address IS NOT NULL AND holder_id IS NULL)
);

-- Demo staff password: Demo@12345
UPDATE users SET password_hash = 'd0e4a0cea069e802e296936d8aa6c4f6:181c21b5a10c626d533f611756777ebd021fe72e9df94120bd5e2aa9aaef66886573fa6a3430c36f0c2c08f5312aee6d316700ff89ad2989ec89000523d99daf'
  WHERE email = 'admin@beicvs.demo' AND role = 'admin';
UPDATE users SET password_hash = '551b5e241f568db0d52e43840127cd59:a582543e271607570289a03bf486c47337f356f1d6cb51cabc41786a9d19b4d660fcd73dbe143b864fbb0acd305892203bfa54381bb0deabaaca712e7ca60175'
  WHERE email = 'verifier@beicvs.demo' AND role = 'verifier';
UPDATE users SET password_hash = '4e02684b4ba5a0fcd671a084479b49b6:cbc719e2263730e0d8a6f8d5e18835651f5f0b81225a1611abc05077ce99ecfaddb3812d131c92e7c0e76204f6d6055cfb0aa607005d6043825649e1235dff4a'
  WHERE email = 'auditor@beicvs.demo' AND role = 'auditor';

-- Any other staff account has no password yet and can't sign in until one is
-- set. List them with:
--   SELECT email, role FROM users WHERE role <> 'policyholder' AND password_hash IS NULL;
