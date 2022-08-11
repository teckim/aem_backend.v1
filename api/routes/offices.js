const Event = require("../../models/event");
const Office = require("../../models/office");
const User = require("../../models/user");
const auth = require("../middleware/auth");
const ac = require("../../roles");

module.exports = (router) => {
  // GET REQUESTES
  // get offices
  router.get("/offices", (req, res, next) => {
    if (req.query.role === 'root') return next()
    let query = req.query.s || "";
    query = new RegExp(".*" + query + ".*", "i");
    const filter = {
      $or: [
        { country: { $regex: query } },
        { province: { $regex: query } },
        { name: { $regex: query } },
      ],
    }
    if (req.query.vacant !== undefined) filter.vacant = req.query.vacant
    Office.find(filter)
      .exec()
      .then((offices) => {
        res.json({ offices });
      })
      .catch(() => res.sendStatus(500));
  }, auth, (req, res) => {
    const decoded = res.locals.decoded;
    if (decoded.role !== "root") return res.sendStatus(403);
    Office.find()
      .populate('members')
      .exec()
      .then((offices) => {
        res.json({ offices });
      })
      .catch(() => res.sendStatus(500));
  });
  router.get("/offices/details", auth, (req, res) => {
    const decoded = res.locals.decoded;
    if (
      !ac.can(decoded.role).readAny("office").granted ||
      !ac.can(decoded.role).readAny("user").granted
    )
      return res.sendStatus(403);
    Office.aggregate()
      .lookup({
        from: "users",
        localField: "_id",
        foreignField: "office",
        as: "admins",
      })
      .exec()
      .then((offices) => {
        res.json({ offices });
      })
      .catch(() => res.sendStatus(500));
  });
  // get events
  router.get("/offices/events", auth, (req, res) => {
    console.log(req.query);
    Event.find({}).skip(0).limit(1000);
    res.sendStatus(200);
  });
  // get offices
  router.get("/offices/:id", (req, res) => {
    let id = req.params.id;
    Office.findById(id)
      .lean()
      .exec()
      .then((office) => {
        res.json({ office });
      })
      .catch(() => res.sendStatus(500));
  });
  // POST REQUESTS
  // post new office
  router.post("/offices", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    if (
      !ac.can(decoded.role).createAny("office").granted ||
      !ac.can(decoded.role).updateAny("user").granted
    )
      return res.sendStatus(403);
    const newOffice = req.body;
    try {
      const count = await Office.countDocuments({ name: newOffice.name });
      if (count)
        return res
          .status(500)
          .json({ message: newOffice.name + " already used" });

      const user = await User.findById(newOffice.admin);
      if (user.role === "root")
        return res.status(500).json({ message: "root accout" });

      newOffice.createdBy = decoded._id;
      let office = new Office(newOffice);
      await office.save();
      user.office = office._id;
      user.role = "officeAdmin";
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
    }
  });
  // PUT REQUESTS
  // update office
  router.put("/offices/:id", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    if (
      !ac.can(decoded.role).updateAny("office").granted ||
      !ac.can(decoded.role).updateAny("user").granted
    )
      return res.sendStatus(403);
    const newOffice = req.body;
    try {
      const count = await Office.countDocuments({
        name: newOffice.name,
        _id: { $ne: req.params.id },
      });
      if (count)
        return res
          .status(500)
          .json({ message: newOffice.name + " already used" });

      const user = await User.findById(newOffice.admin);
      if (user.role === "root")
        return res.status(500).json({ message: "root account" });
      let office = await Office.findById(req.params.id);
      Object.assign(office, newOffice);
      await office.save();
      user.office = office._id;
      user.role = "officeAdmin";
      await user.save();
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
    }
  });
  // update office tasks and vacant
  router.put("/offices/settings/:id", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    if (!ac.can(decoded.role).updateOwn("office").granted)
      return res.sendStatus(403);
    if (decoded.office !== req.params.id) return res.sendStatus(401);
    const { tasks, vacant } = req.body;
    try {
      let office = await Office.findById(req.params.id);
      office.vacant = vacant;
      office.tasks = tasks;
      await office.save();
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
    }
  });
  // DELETE REQUESTS
  // delete office
  router.delete("/offices/:id", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).deleteAny("office");
    if (!permission.granted) return res.sendStatus(403);
    Office.deleteOne({ _id: req.params.id })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => res.status(500).json(err));
  });
};
