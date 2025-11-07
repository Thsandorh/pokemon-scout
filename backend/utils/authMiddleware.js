import jwt from "jsonwebtoken";
import { getUserById } from "../repositories/userRepo.js";

// JWT secret - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "pokemon-scout-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Express middleware to require authentication
 */
export function requireAuth(req, res, next) {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // Fallback to cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Verify user still exists
    const user = getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("[AUTH] Authentication error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Express middleware to require admin privileges
 */
export function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Admin privileges required" });
    }

    next();
  } catch (error) {
    console.error("[AUTH] Admin check error:", error);
    return res.status(403).json({ error: "Authorization failed" });
  }
}

/**
 * Optional auth middleware - attaches user if authenticated but doesn't require it
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = getUserById(decoded.id);
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
}
