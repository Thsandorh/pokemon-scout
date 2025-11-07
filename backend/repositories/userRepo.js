import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "../db.js";

const SALT_ROUNDS = 10;

/**
 * Create a new user
 */
export function createUser({ email, password, isAdmin = false }) {
  const existing = getUserByEmail(email);
  if (existing) {
    throw new Error("User with this email already exists");
  }

  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, is_admin, created_at, updated_at)
     VALUES ($id, $email, $passwordHash, $isAdmin, datetime('now'), datetime('now'))`
  ).run({
    id,
    email: email.toLowerCase().trim(),
    passwordHash,
    isAdmin: isAdmin ? 1 : 0,
  });

  return getUserById(id);
}

/**
 * Get user by ID
 */
export function getUserById(id) {
  const user = db
    .prepare("SELECT id, email, is_admin, created_at, updated_at FROM users WHERE id = $id")
    .get({ id });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    isAdmin: Boolean(user.is_admin),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Get user by email
 */
export function getUserByEmail(email) {
  const user = db
    .prepare("SELECT id, email, is_admin, created_at, updated_at FROM users WHERE email = $email")
    .get({ email: email.toLowerCase().trim() });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    isAdmin: Boolean(user.is_admin),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Verify user password
 */
export function verifyUserPassword(email, password) {
  const user = db
    .prepare("SELECT id, email, password_hash, is_admin, created_at, updated_at FROM users WHERE email = $email")
    .get({ email: email.toLowerCase().trim() });

  if (!user) return null;

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    isAdmin: Boolean(user.is_admin),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Update user password
 */
export function updateUserPassword(userId, newPassword) {
  const passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);

  db.prepare(
    `UPDATE users SET password_hash = $passwordHash, updated_at = datetime('now') WHERE id = $userId`
  ).run({ userId, passwordHash });

  return getUserById(userId);
}

/**
 * List all users (admin only)
 */
export function listUsers({ limit = 50, offset = 0 } = {}) {
  const users = db
    .prepare(
      `SELECT id, email, is_admin, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $limit OFFSET $offset`
    )
    .all({ limit, offset });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    isAdmin: Boolean(user.is_admin),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));
}

/**
 * Get user count
 */
export function getUserCount() {
  const result = db.prepare("SELECT COUNT(*) as count FROM users").get();
  return result.count;
}

/**
 * Delete user
 */
export function deleteUser(userId) {
  db.prepare("DELETE FROM users WHERE id = $userId").run({ userId });
}

/**
 * Make user admin
 */
export function makeAdmin(userId) {
  db.prepare("UPDATE users SET is_admin = 1, updated_at = datetime('now') WHERE id = $userId").run({
    userId,
  });
  return getUserById(userId);
}
