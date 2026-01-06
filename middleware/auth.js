import jwt from "jsonwebtoken";

/**
 * Verify admin JWT
 * Authorization: Bearer <token>
 */
export function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing or malformed Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.isAdmin !== true) {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    req.admin = {
      id: decoded.adminId,
      isAdmin: true,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}
