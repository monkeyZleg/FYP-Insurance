-- Claim types changed from health/life/transportation/flight to car/motor/travel/health.
-- Run once on an existing database (Supabase SQL editor). 'life' stays allowed for old rows.
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_insurance_type_check;
UPDATE claims SET insurance_type = 'car'    WHERE insurance_type = 'transportation';
UPDATE claims SET insurance_type = 'travel' WHERE insurance_type = 'flight';
ALTER TABLE claims ADD CONSTRAINT claims_insurance_type_check
  CHECK (insurance_type IN ('car','motor','travel','health','life'));
