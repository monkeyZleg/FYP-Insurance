-- Demo accounts for the local Hardhat chain. Run after schema.sql.
--
-- Staff wallets are the Hardhat test accounts that scripts/deploy.js grants
-- ADMIN_ROLE / VERIFIER_ROLE / AUDITOR_ROLE (deployments/localhost.json).
-- Import their private keys into MetaMask to log in as each role.
INSERT INTO users (wallet_address, full_name, email, role) VALUES
  ('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'Demo Admin',    'admin@beicvs.demo',    'admin'),
  ('0x90f79bf6eb2c4f870365e785982e1f101e93b906', 'Demo Verifier', 'verifier@beicvs.demo', 'verifier'),
  ('0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', 'Demo Auditor',  'auditor@beicvs.demo',  'auditor');

-- Demo policyholder: demo@beicvs.demo / Demo@12345
-- holder_id was derived from this id with the HOLDER_ID_SALT in backend/.env;
-- if that salt changes, register a new policyholder instead.
INSERT INTO users (id, holder_id, password_hash, full_name, email, role) VALUES
  ('e673e632-d8c9-4247-be14-47777e21abe7',
   '0x8e5fd0ab85cad1397c2dc060e7f68cfa019e71beb7326b4cb005cfd647945f14',
   '87e8ceb0e0debe97e912b3dc2a9c9d74:2523581eec4eacd105a47542b94111c5785622cdefac8b3c3d08e90ee99bfaa3116ec84e90e9fad221e7f0640f4c82f145d5ae3f13a46881ca5db41a04cd5068',
   'Demo Policyholder', 'demo@beicvs.demo', 'policyholder');
