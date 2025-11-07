import { db, flushDatabase } from "./backend/db.js";

const email = process.argv[2];

if (!email) {
  console.error("Usage: node make-admin.js <email>");
  process.exit(1);
}

db.prepare("UPDATE users SET is_admin = 1 WHERE email = ?").run(email.toLowerCase().trim());

const user = db.prepare("SELECT id, email, is_admin FROM users WHERE email = ?").get(email.toLowerCase().trim());

if (user) {
  console.log("User updated:", user);
} else {
  console.log("User not found");
}

// Ensure changes are written to disk
flushDatabase();

process.exit(0);
