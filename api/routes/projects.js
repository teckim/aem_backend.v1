const Project = require("../../models/project");
const auth = require("../middleware/auth");
const ac = require("../../roles");

module.exports = (router) => {
  // GET REQUESTES
  // get projects
  router.get("/projects", (req, res) => {
    Project.find({}, "-createdBy")
      .lean()
      .exec()
      .then((projects) => {
        res.json({ projects });
      })
      .catch(() => res.sendStatus(500));
  });

  // POST REQUESTS
  // create project
  router.post("/projects", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    if (!ac.can(decoded.role).createAny("project").granted)
      return res.sendStatus(403);
    const newProject = req.body;
    try {
      const count = await Project.countDocuments({ title: newProject.title, _id: { $ne: req.params.id } });
      if (count)
        return res
          .status(500)
          .json({ message: newProject.title + " already used" });
      newProject.createdBy = decoded._id
      let project = new Project(newProject)
      await project.save();
      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  // PUT REQUESTS
  // update project
  router.put("/projects/:id", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    if (!ac.can(decoded.role).updateAny("project").granted)
      return res.sendStatus(403);
    const newProject = req.body;
    try {
      const count = await Project.countDocuments({ title: newProject.title, _id: { $ne: req.params.id } });
      if (count)
        return res
          .status(500)
          .json({ message: newProject.title + " already used" });
      let project = await Project.findById(req.params.id);
      Object.assign(project, newProject);
      await project.save();
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
    }
  });

  // DELETE REQUESTS
  // delete office
  router.delete("/projects/:id", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).deleteAny("project");
    if (!permission.granted) return res.sendStatus(403);
    Project.deleteOne({ _id: req.params.id })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => res.status(500).json(err));
  });
};
