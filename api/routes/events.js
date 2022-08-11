const Event = require("../../models/event");
const User = require("../../models/user");
const Project = require("../../models/project");
const auth = require("../middleware/auth");
const ac = require("../../roles");
const { email } = require("../../plugins/helpers");

module.exports = (router) => {
  router.get("/events/tests", async (req, res) => {
    // User.find({}, "first email followOffice")
    //   .exec()
    //   .then((users) => {
    //     res.json({ users });
    //   });
    // const event = await Event.findById("5eebfda4e3abc3c5aef47e7f");
    // email.sendNewEvents([event]);
    res.send();
  });
  // GET REQUESTES
  // get all events
  router.get("/events", async (req, res) => {
    // const office = req.query.office;
    const page = JSON.parse(req.query.page);
    const limit = parseInt(page.limit);
    const pageNumber = (parseInt(page.number) - 1) * limit;
    delete req.query.page;
    const query = {
      suspended: false,
      startsOn: { $gte: new Date() },
    };
    if (req.query.project) query.project = req.query.project;
    if (req.query.office) query.office = req.query.office;

    // if (!office) delete query.office
    Event.paginate(query, {
      page: parseInt(page.number),
      limit,
      lean: true,
      sort: "-startsOn",
      populate: [
        { path: "office", select: "currency province country name" },
        { path: "project", select: "title -_id" },
      ],
    })
    // Event.find(query)
    //   .skip(pageNumber)
    //   .limit(limit)
    //   .populate("project", "title -_id")
    //   .populate("office", "currency province country name")
    //   .sort("startsOn")
    //   .lean()
    //   .exec()
      .then((events) => {
        res.json(events);
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(500);
      });
  });
  // get latest events:
  router.get("/events/latest", (req, res) => {
    Event.find({
      startsOn: { $gte: new Date() },
    })
      .limit(5)
      .sort("-startsOn")
      .populate("ticketsCount")
      .populate("project", "title -_id")
      .lean()
      .exec()
      .then((events) => {
        res.json({ events });
      })
      .catch(() => {
        res.sendStatus(500);
      });
  });
  // get events by office
  // to be edited (not complete)
  router.get("/events/office", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).readOwn("event");
    if (!permission.granted) return res.sendStatus(403);
    const q = req.query;
    const page = parseInt(q.page);
    const limit = parseInt(q.limit);
    let query = {};
    if (!limit || !page || limit <= 0 || limit > 50 || page <= 0) {
      query = {
        office: decoded.office,
      };
    } else {
      query = {
        endsOn: q.state === "live" ? { $gte: new Date() } : { $lt: new Date() },
        office: decoded.office,
      };
    }
      Event.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort("-startsOn")
        .populate("ticketsCount")
        .populate("project", "title -_id")
        .exec()
      .then((events) => {
        // const result = await getTicketsCount(events);
        res.status(200).json({ events });
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ message: "Error getting events, please try again" });
      });
  });
  // get event by id:
  router.get("/events/:id", (req, res) => {
    Event.findById(req.params.id)
      .populate("ticketsCount")
      .populate("project")
      .populate("office")
      .populate("sponsors")
      .exec()
      .then((event) => {
        if (!event) return res.sendStatus(404)
        res.status(200).json(event);
      })
      .catch(() => {
        res.status(500).json({
          message: "Error finding event",
        })
      });
  });

  // POST REQUESTS:
  // ADD new event:
  router.post("/events", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).createOwn("event");
    if (!permission.granted) return res.sendStatus(403);
    const event = new Event(req.body);
    event.createdBy = decoded._id;
    event.office = decoded.office;
    event
      .save()
      .then(() => {
        res.sendStatus(200);
        if (req.body.notify) email.sendNewEvents([event], decoded.office);

        const date = new Date(event.startsOn);
        date.setDate(date.getDate() - 1);
        if (date.getTime() <= new Date().getTime()) return;
        const schedule = require("node-schedule");
        schedule.scheduleJob(
          date,
          async function (id) {
            let event = await Event.findById(id)
              .populate({
                path: "tickets",
                populate: {
                  path: "user",
                },
              })
              .populate("project")
              .populate("office")
              .lean({ virtuals: true })
              .exec();
            email.sendEventReminder(event);
          }.bind(null, event._id)
        );
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ message: "Error creating event" });
      });
  });

  // PUT REQUESTS:
  // UPDATE event:
  router.put("/events/:id", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    const newEvent = req.body;
    if (decoded.office !== newEvent.office._id && decoded.role !== "root")
      return res.sendStatus(403);
    const permission = ac.can(decoded.role).updateOwn("event");
    if (!permission.granted) return res.sendStatus(403);

    const event = await Event.findById(req.params.id)
      .populate("ticketsCount")
      .exec();
    if (!event) return res.status(500).json({ message: "No event found" });
    if (event.startsOn.getTime() <= new Date().getTime())
      return res
        .status(500)
        .json({ message: "Cannot edit passed or started event" });
    if (event.ticketsCount) email.sendEventChangements(event, newEvent);

    Object.assign(event, newEvent);
    event
      .save()
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => {
        res.status(500).json({
          message:
            err.errors[Object.keys(err.errors)[0]].message ||
            "Error updating the event",
        });
      });
    // res.send();
  });

  // DELETE REQUESTS:
  // DELETE event:
  router.delete("/events/:id", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).deleteOwn("event");
    if (!permission.granted) return res.sendStatus(403);
    Event.deleteOne({ _id: req.params.id })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => res.status(500).json(err));
  });
};
