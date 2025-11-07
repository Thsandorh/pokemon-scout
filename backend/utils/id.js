import { randomBytes } from "crypto";

/**
 * Generate a CUID-like ID
 * Simple implementation using random bytes
 */
export function cuid() {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString("hex");
  return `${timestamp}${randomPart}`;
}
