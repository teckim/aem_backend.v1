const Sponsor = require("../../models/sponsor");
const auth = require("../middleware/auth");
const ac = require("../../roles");

module.exports = (router) => {
  // GET REQUESTES
  // get sponsor
  router.get("/sponsors", (req, res) => {
    let query = {}
    if (req.query.type) {
      query.type = req.query.type
    }
    Sponsor.find(query, "-createdBy")
      .lean()
      .exec()
      .then((sponsors) => {
        res.json({ sponsors });
      })
      .catch(() => res.sendStatus(500));
  });

  // POST REQUESTS
  // create Sponsor
  router.post("/sponsors", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    if (!ac.can(decoded.role).createAny("sponsor").granted)
      return res.sendStatus(403);
    const newSponsor = req.body;
    try {
      const count = await Sponsor.countDocuments({ name: newSponsor.name });
      if (count)
        return res
          .status(500)
          .json({ message: newSponsor.name + " already stored" });
      newSponsor.createdBy = decoded._id
      let sponsor = new Sponsor(newSponsor)
      await sponsor.save();
      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  // PUT REQUESTS
  // update sponsor
  router.put("/sponsors/:id", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    if (!ac.can(decoded.role).updateAny("sponsor").granted)
      return res.sendStatus(403);
    const newSponsor = req.body;
    try {
      const count = await Sponsor.countDocuments({ name: newSponsor.name, _id: { $ne: req.params.id } });
      if (count)
        return res
          .status(500)
          .json({ message: newSponsor.name + " already stored" });
      let sponsor = await Sponsor.findById(req.params.id);
      Object.assign(sponsor, newSponsor);
      await sponsor.save();
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
    }
  });

  // DELETE REQUESTS
  // delete office
  router.delete("/sponsors/:id", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).deleteAny("sponsor");
    if (!permission.granted) return res.sendStatus(403);
    Sponsor.deleteOne({ _id: req.params.id })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => res.status(500).json(err));
  });
};
