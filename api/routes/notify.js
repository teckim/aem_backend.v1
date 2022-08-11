const Order = require("../../models/order");
const Event = require("../../models/event");
const auth = require("../middleware/auth");
const ac = require("../../roles");
const { email } = require("../../plugins/helpers");

module.exports = (router) => {
  // POST REQUESTS:
  // send email notification of events
  router.post("/notifications/events", auth, async (req, res) => {
    const ids = req.body.ids;
    const office = res.locals.decoded.office
    if (!ids || typeof ids !== "object") return res.sendStatus(500);
    try {
      const events = await Event.find({ _id: { $in: ids } }).lean().exec();
      email.sendNewEvents(events, office)
      res.send()
    } catch (e) {
      res.status(500).json({ message: 'Error sending emails' })
    }
  });
};
