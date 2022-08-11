const { isValidToken } = require("../../plugins/helpers");

var auth = function (req, res, next) {
  const decoded = isValidToken(req.headers.authorization, "auth");
  if (!decoded) return res.sendStatus(401);
  res.locals.decoded = decoded;
  next();
};
module.exports = auth;
