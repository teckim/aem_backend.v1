const User = require("../../models/user");
const Join = require("../../models/join");
const auth = require("../middleware/auth");
const ac = require("../../roles");

module.exports = (router) => {
  // get office members
  router.get("/members", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).readOwn("office");
    if (!permission.granted) return res.sendStatus(403);
    const q = req.query;
    const page = parseInt(q.page);
    const limit = parseInt(q.limit);
    User.find({ office: decoded.office })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec()
      .then((members) => {
        res.status(200).json({ members });
      })
      .catch(() => {
        res
          .status(500)
          .json({ message: "Error getting members, please try again" });
      });
  });
  // POST REQUESTS
  // ADD new memeber to office
  router.post("/members", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).updateAny("user");
    if (!permission.granted) return res.sendStatus(403);
    const member = req.body;
    if (!member.email || !member.role) return res.sendStatus(400);
    try {
      const user = await User.findOne({ email: member.email });
      if (!user) return res.status(500).json({ message: "No user found" });
      if (user.office && user.office.toString() === decoded.office)
        return res
          .status(500)
          .json({ message: "This user is already with your office" });
      if (user.office || user.role !== "user")
        return res
          .status(500)
          .json({ message: "This user is already with an other office" });
      user.office = decoded.office;
      user.role = member.role;
      await user.save()
      await Join.deleteOne({ user: user._id });
      res.sendStatus(200);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Error adding member" });
    }
  });
  // DELETE REQUESTS
  router.delete("/members/:id", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).updateAny("user");
    if (!permission.granted) return res.sendStatus(403);
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(500).json({ message: "No user found" });
    if (
      user.office.toString() !== decoded.office ||
      user.role === "officeAdmin"
    )
      return res.sendStatus(500);
    user.set("office", undefined);
    user.role = "user";
    await user.save();
    res.sendStatus(200);
  });
};
