const crypto = require("crypto");

/*
 * eKYC checks for Malaysian MyKad (IC) numbers: YYMMDD-PB-###G
 *   YYMMDD  date of birth
 *   PB      place of birth (state code 01-16, 21-59, or a country code)
 *   ###G    serial; the last digit is odd for male, even for female
 */

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIN_AGE = 18;

// Place-of-birth codes that are never issued.
const INVALID_PB = new Set(["00", "17", "18", "19", "20", "69", "70", "73", "80", "81", "94", "95", "96", "97"]);

/** Parse a MyKad number. Returns { digits, dob, gender } or { error }. */
function parseMyKad(input, today = new Date()) {
  const digits = String(input || "").replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(digits)) return { error: "IC number must be 12 digits (e.g. 990101-14-5678)" };

  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  // Two-digit year: anything after this year belongs to the 1900s.
  const year = yy > today.getFullYear() % 100 ? 1900 + yy : 2000 + yy;
  const dob = new Date(Date.UTC(year, mm - 1, dd));
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== mm - 1 || dob.getUTCDate() !== dd)
    return { error: "IC number contains an invalid date of birth" };

  if (INVALID_PB.has(digits.slice(6, 8))) return { error: "IC number has an invalid place-of-birth code" };

  return {
    digits,
    dob: dob.toISOString().slice(0, 10),
    gender: Number(digits[11]) % 2 === 1 ? "male" : "female",
  };
}

function ageOn(dobIso, today = new Date()) {
  const [y, m, d] = dobIso.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

function maskIc(digits) {
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-****`;
}

/** Keyed hash so the IC can be checked for reuse without storing it. */
function hashIc(digits) {
  const key = process.env.EKYC_SECRET || process.env.HOLDER_ID_SALT || process.env.JWT_SECRET;
  return crypto.createHmac("sha256", key).update(digits).digest("hex");
}

function sha256(buf) {
  return "0x" + crypto.createHash("sha256").update(buf).digest("hex");
}

const nameTokens = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/\b(BIN|BINTI|BTE|BT|A\/L|A\/P|AL|AP)\b/g, " ")
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Share of the IC name's words that appear in the account name (0..1). */
function nameMatchScore(icName, accountName) {
  const a = nameTokens(icName);
  const b = new Set(nameTokens(accountName));
  if (!a.length) return 0;
  return a.filter((t) => b.has(t)).length / a.length;
}

function checkImage(file, label, required) {
  if (!file) return required ? `${label} is required` : null;
  if (!ALLOWED_MIME.includes(file.mimetype)) return `${label} must be a JPG, PNG or WebP image`;
  if (file.size > MAX_FILE_BYTES) return `${label} must be 5 MB or smaller`;
  if (file.size < 10 * 1024) return `${label} looks too small to be readable`;
  return null;
}

/**
 * Run every automatic check. Returns { errors, checks, parsed }.
 * errors   hard failures: the submission is refused
 * checks   pass/fail record saved with the submission for the admin
 */
function runChecks({ fullName, icNumber, accountName, files }) {
  const errors = [];
  const parsed = parseMyKad(icNumber);
  if (parsed.error) errors.push(parsed.error);

  if (!String(fullName || "").trim()) errors.push("Full name as printed on the IC is required");

  const age = parsed.dob ? ageOn(parsed.dob) : null;
  if (age !== null && age < MIN_AGE) errors.push(`You must be at least ${MIN_AGE} years old`);

  for (const [file, label, required] of [
    [files.icFront, "IC front photo", true],
    [files.icBack, "IC back photo", false],
    [files.selfie, "Selfie", true],
  ]) {
    const e = checkImage(file, label, required);
    if (e) errors.push(e);
  }

  const hashes = {
    icFront: files.icFront && sha256(files.icFront.buffer),
    icBack: files.icBack && sha256(files.icBack.buffer),
    selfie: files.selfie && sha256(files.selfie.buffer),
  };
  if (hashes.selfie && (hashes.selfie === hashes.icFront || hashes.selfie === hashes.icBack))
    errors.push("The selfie can't be the same image as the IC photo");

  const nameScore = nameMatchScore(fullName, accountName);
  const checks = {
    icFormat: !parsed.error,
    dateOfBirth: parsed.dob || null,
    age,
    ageOk: age !== null && age >= MIN_AGE,
    nameMatchScore: Math.round(nameScore * 100) / 100,
    // Not a hard failure: the admin decides, e.g. for a nickname on the account.
    nameMatchesAccount: nameScore >= 0.8,
    imagesOk: !errors.some((e) => /photo|Selfie|selfie/.test(e)),
    faceMatch: "manual review (simulated)",
  };

  return { errors, checks, parsed, hashes };
}

module.exports = { parseMyKad, ageOn, maskIc, hashIc, nameMatchScore, runChecks, ALLOWED_MIME, MAX_FILE_BYTES };
