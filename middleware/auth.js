import jwt from "jsonwebtoken";

/**
 * Verify admin JWT
 * Expects header:
 * Authorization: Bearer <token>
 */
export function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Missing or malformed Authorization header",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this token belongs to an admin
    if (!decoded || decoded.isAdmin !== true) {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    // Attach admin info to request (optional, future use)
    req.admin = {
      id: decoded.adminId,
      tokenIssuedAt: decoded.iat,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}
