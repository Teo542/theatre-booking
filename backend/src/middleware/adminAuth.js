const jwt = require("jsonwebtoken");

function adminAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: "Invalid or expired token" });
    if (!user.is_admin) return res.status(403).json({ error: "Admin access required" });
    req.user = user;
    next();
  });
}
module.exports = adminAuth;