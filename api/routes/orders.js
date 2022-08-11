const Order = require("../../models/order");
const Event = require("../../models/event");
const User = require("../../models/user");
const auth = require("../middleware/auth");
const ac = require("../../roles");
const path = require("path");
const { email } = require("../../plugins/helpers");

module.exports = (router) => {
  // GET REQUESTS:
  // router.get("/orders/test/:id", async (req, res) => {
    
  // });
  // GET orders by event
  router.get("/orders/event/:id", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const eventId = req.params.id;
    const permission = ac.can(decoded.role).readAny("order");
    if (!permission.granted) return res.sendStatus(403);
    const q = req.query;
    const page = parseInt(q.page);
    const limit = parseInt(q.limit);
    Order.find({
      event: eventId,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort("-createdOn")
      .populate("event", "office")
      .populate({
        path: "user",
        populate: [
          { path: "checkedTicketsCount" },
          { path: "uncheckedTicketsCount" },
        ],
      })
      .lean({ virtuals: true })
      .exec()
      .then((orders) => {
        res.status(200).json({ orders });
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ message: "Error getting tickets, please try again" });
      });
  });
  // GET orders by user
  router.get("/orders/user", auth, (req, res) => {
    const decoded = res.locals.decoded;
    const userId = decoded._id;
    const permission = ac.can(decoded.role).readOwn("order");
    if (!permission.granted) return res.sendStatus(403);
    const q = req.query;
    const page = parseInt(q.page);
    const limit = parseInt(q.limit);
    Order.find({
      user: userId,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort("-createdOn")
      .populate({
        path: "event",
        populate: {
          path: "office",
          select: "name province country currency",
        },
      })
      .exec()
      .then((tickets) => {
        res.status(200).json({ tickets });
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ message: "Error getting tickets, please try again" });
      });
  });
  router.get("/orders/:id/pdf", async (req, res) => {
    const PDF = require("pdfkit");
    const QRCode = require("qrcode");
    const ticket = await Order.findById(req.params.id)
      .populate({
        path: "event",
        populate: {
          path: "office",
          select: "name province country currency",
        },
      })
      .populate("user");
    const qr = await QRCode.toDataURL(ticket._id);
    const qrData = new Buffer.from(qr.split("base64,")[1], "base64");
    let pdf = new PDF({ bufferPages: true });
    // pdf.pipe(res);
    let buffers = [];
    pdf.on("data", buffers.push.bind(buffers));
    pdf.on("end", () => {
      let pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        "Content-Length": Buffer.byteLength(pdfData),
        "Content-Type": "application/pdf",
        "Content-disposition":
          "attachment;filename=ticket-" +
          ticket.user.first +
          "-" +
          ticket._id +
          ".pdf",
      });
      res.end(pdfData);
    });

    pdf
      .font(path.join(process.cwd(), "./assets/fonts/quicksand.ttf"))
      .image(path.join(process.cwd(), "./assets/aem.png"), 50, 19, {
        width: 100,
      })

      .fillColor("#ee8b5d")
      .fontSize(20)
      .text(ticket.event.subject, 150, 35, { width: 410, align: "right" })

      .rect(50, 63, 510, 140)
      .stroke("grey")

      .fillColor("#000")
      .fontSize(16)
      .text(ticket.user.first + " " + ticket.user.last.toUpperCase(), 55, 70)

      .fontSize(10)
      .text(ticket.user.email)
      .moveDown(1)

      .fontSize(16)
      .text(ticket.event.startsOn.toUTCString())
      .moveDown(1)

      .fontSize(16)
      .text(ticket.event.location.name + " - " + ticket.event.location.address)
      .fontSize(10)
      .text("by " + ticket.event.office.name + " Team")

      .image(qrData, 455, 100, { width: 100 })

      .fillColor("red")
      .fontSize(16)
      .text("Note:", 50, 250)
      .fillColor("#000")
      .fontSize(12)
      .text(
        "We really appreciate being present at the event since you got a ticket,\nother ways please make sure to cancel it. \n3 unchecked tickets in my cause you being banned from our events for a while."
      );
    pdf.end();
  });

  // POST REQUESTS
  // ADD new order (ticket)
  router.post("/orders", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    const eventId = req.body.id;
    let event, order;
    try {
      const count = await Order.countDocuments({
        user: decoded._id,
        event: eventId,
      });
      if (count !== 0)
        return res.status(500).json({
          message: "You alredy got a ticket, check your tickets please",
        });
      event = await Event.findById(eventId)
        .populate("ticketsCount")
        .lean()
        .exec();
      if (event.suspended)
        return res.status(500).json({
          message: "This event is suspended for now, check again later",
        });
      if (event.startsOn.getTime() < new Date().getTime())
        return res
          .status(500)
          .json({ message: "This event is no more available" });
      let user = await User.findById(decoded._id);
      let blocked = await user.isBlocked();
      if (blocked)
        return res
          .status(500)
          .json({ message: "Unfortunately, You are blocked from getting tickets" });
      order = new Order({
        event: eventId,
        user: decoded._id,
      });
      await order.save();
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500).json({
        message: "Error accured while trying to get you a ticket, please retry",
      });
    }
    await order.populate("user").execPopulate();
    order = order.toJSON();
    order.event = event;
    email.sendEventTicket(order);
  });

  // PUT REQUESTS
  // TOGGLE checkedIn value
  router.put("/orders/:id/checking", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).updateOwn("order");
    if (!permission.granted) return res.sendStatus(403);
    const state = req.body.checkedIn;
    const event = req.query.event;
    Order.findOneAndUpdate(
      { _id: req.params.id, checkedIn: !state, event },
      { checkedIn: !!state }
    )
      .then((order) => {
        if (!order)
          return res
            .status(500)
            .json({ message: "No ticket or it's already checked" });
        res.sendStatus(200);
      })
      .catch(() => {
        res.status(500).json({ message: "Error while checking ticket" });
      });
  });
  router.put("/orders/:id", auth, async (req, res) => {
    const decoded = res.locals.decoded;
    const permission = ac.can(decoded.role).updateOwn("order");
    if (!permission.granted) return res.sendStatus(403);
    let data;
    if (!req.body.table) {
      data = { note: req.body.note, paid: req.body.paid };
    } else {
      data = { table: req.body.table };
    }
    const event = req.query.event;
    Order.findOneAndUpdate({ _id: req.params.id, event }, data)
      .then((order) => {
        if (!order) return res.status(500).json({ message: "No ticket found" });
        res.sendStatus(200);
      })
      .catch(() => {
        res.status(500).json({ message: "Error while updating ticket info" });
      });
  });

  // DELETE REQUESTS
  // Delete ticket
  router.delete("/orders/:id", auth, async (req, res) => {
    const id = req.params.id;
    const eventId = req.query.event;
    if (!id || !eventId) return res.sendStatus(500);
    const order = await Order.findOne({ _id: id, event: eventId }).populate(
      "event"
    );
    if (!order || !order.event)
      return res.status(500).json({ message: "No ticket found" });
    if (order.paid)
      return res.status(500).json({ message: "Cannot cancel a paid ticket" });
    if (order.event.state === "live" || order.event.state === "past")
      return res
        .status(500)
        .json({ message: "Cannot cancel ticket of live or past event" });
    if (
      order.event.startsOn.getTime() - new Date().getTime() <
      1000 * 60 * 60 * 24
    )
      return res.status(500).json({
        message: "less than 24h to event start, Cannot cancel ticket",
      });
    res.send();
    order
      .remove()
      .then(() => {
        res.send();
      })
      .catch(() => res.sendStatus(500));
  });
};
