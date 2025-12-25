const crypto = require("crypto");

const SECRET = process.env.TELECMI_SECRET || "ENIS_TELECMI_SECRET_2025";
const ALGORITHM = "aes-256-cbc";

const key = crypto.createHash("sha256").update(SECRET).digest();
const iv = Buffer.alloc(16, 0); // fixed IV (ok for credentials)

exports.encrypt = (text) => {
  if (!text) return "";
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

exports.decrypt = (encrypted) => {
  if (!encrypted) return "";
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
