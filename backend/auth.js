
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Please sign in to continue.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const staffId = Number(decoded.id);

    if (
      !Number.isSafeInteger(staffId) ||
      staffId <= 0 ||
      !["admin", "employee"].includes(decoded.role)
    ) {
      return res.status(401).json({
        message: "Your session is invalid or expired. Please sign in again.",
      });
    }

    req.staff = {
      id: staffId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please sign in again.",
    });
  }
}

module.exports = requireAuth;
