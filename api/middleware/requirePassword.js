const User = require("../../models/user");

var requirePassword = async function (req, res, next) {
  const password = req.body.password;
  if (!password)
    return res.status(403).json({ message: "Password required" });
    
  const user = await User.findById(res.locals.decoded._id);
  if (!user)
    return res.status(500).json({ message: "Somehow, No account found" });
  if (!user.validPassword(password))
    return res.status(403).json({ message: "Wrong password" });
  res.locals.user = user;
  next();
};
module.exports = requirePassword;
