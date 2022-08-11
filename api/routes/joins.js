const Join = require("../../models/join");
const auth = require("../middleware/auth");
const ac = require("../../roles");
const { email } = require("../../plugins/helpers");

module.exports = (router) => {
  router.get("/joins", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).readOwn("join");
    if (!permission.granted) return res.sendStatus(403);
    const q = req.query;
    const page = parseInt(q.page);
    const limit = parseInt(q.limit);
    Join.find({
      office: decoded.office,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort("-createdOn")
      .populate({
        path: "user",
        populate: [
          { path: "checkedTicketsCount" },
          { path: "uncheckedTicketsCount" },
        ],
      })
      .lean({ virtuals: true })
      .exec()
      .then((joins) => {
        res.status(200).json({ joins });
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ message: "Error getting requests, please try again" });
      });
  });
  router.post("/joins", auth, async (req, res) => {
    const user = res.locals.decoded;
    if (user.office)
      return res.status(500).json({ message: "Already a member in a team" });
    const { position, office } = req.body;
    if (!position || !office) return res.sendStatus(500);
    if (await Join.countDocuments({ user: user._id }))
      return res.status(500).json({ message: "Already requested"})
    try {
      const join = new Join({ position, office, user: user._id });
      await join.save();
      res.send();
    } catch (err) {
      res.sendStatus(500);
    }
  });
  router.delete("/joins/:id", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).deleteOwn("join");
    if (!permission.granted) return res.sendStatus(403);

    Join.findByIdAndDelete(req.params.id)
      .then(() => res.send())
      .catch(() =>
        res.status(500).json({
          message: "Error while delete join request",
        })
      );
  });
};
