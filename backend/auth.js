
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

    req.staff = {
      id: decoded.id,
      username: decoded.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please sign in again.",
    });
  }
}

module.exports = requireAuth;
