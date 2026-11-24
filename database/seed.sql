-- Demo accounts for the local Hardhat chain. Run after schema.sql.
--
-- Demo staff sign in with email + password Demo@12345 (choose their role on
-- the login page). Their wallets are the Hardhat test accounts that
-- scripts/deploy.js grants ADMIN_ROLE / VERIFIER_ROLE / AUDITOR_ROLE
-- (deployments/localhost.json); import those private keys into MetaMask to
-- sign each role's on-chain actions.
INSERT INTO users (wallet_address, password_hash, full_name, email, role) VALUES
  ('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
   'd0e4a0cea069e802e296936d8aa6c4f6:181c21b5a10c626d533f611756777ebd021fe72e9df94120bd5e2aa9aaef66886573fa6a3430c36f0c2c08f5312aee6d316700ff89ad2989ec89000523d99daf',
   'Demo Admin',    'admin@beicvs.demo',    'admin'),
  ('0x90f79bf6eb2c4f870365e785982e1f101e93b906',
   '551b5e241f568db0d52e43840127cd59:a582543e271607570289a03bf486c47337f356f1d6cb51cabc41786a9d19b4d660fcd73dbe143b864fbb0acd305892203bfa54381bb0deabaaca712e7ca60175',
   'Demo Verifier', 'verifier@beicvs.demo', 'verifier'),
  ('0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
   '4e02684b4ba5a0fcd671a084479b49b6:cbc719e2263730e0d8a6f8d5e18835651f5f0b81225a1611abc05077ce99ecfaddb3812d131c92e7c0e76204f6d6055cfb0aa607005d6043825649e1235dff4a',
   'Demo Auditor',  'auditor@beicvs.demo',  'auditor');

-- Demo policyholder: demo@beicvs.demo / Demo@12345
-- holder_id was derived from this id with the HOLDER_ID_SALT in backend/.env;
-- if that salt changes, register a new policyholder instead.
INSERT INTO users (id, holder_id, password_hash, full_name, email, role) VALUES
  ('e673e632-d8c9-4247-be14-47777e21abe7',
   '0x8e5fd0ab85cad1397c2dc060e7f68cfa019e71beb7326b4cb005cfd647945f14',
   '87e8ceb0e0debe97e912b3dc2a9c9d74:2523581eec4eacd105a47542b94111c5785622cdefac8b3c3d08e90ee99bfaa3116ec84e90e9fad221e7f0640f4c82f145d5ae3f13a46881ca5db41a04cd5068',
   'Demo Policyholder', 'demo@beicvs.demo', 'policyholder');
