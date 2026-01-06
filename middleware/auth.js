import jwt from "jsonwebtoken";

/**
 * Verify admin JWT
 *
 * Expected header:
 * Authorization: Bearer <token>
 *
 * Token payload example:
 * {
 *   adminId: number,
 *   isAdmin: true,
 *   iat: number,
 *   exp: number
 * }
 */
export function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // 1️⃣ Check header existence & format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing or malformed Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Validate admin privilege
    if (!decoded || decoded.isAdmin !== true) {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    // 4️⃣ Attach admin info to request (future-proof)
    req.admin = {
      id: decoded.adminId,
      isAdmin: decoded.isAdmin,
      issuedAt: decoded.iat,
      expiresAt: decoded.exp,
    };

    // 5️⃣ Continue
    next();
  } catch (err) {
    // Token expired / invalid / tampered
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}
