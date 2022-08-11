const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const QRCode = require("qrcode");
const Email = require("email-templates");
const Order = require("../models/order");

const images = {
  logo: "https://i.ibb.co/2yPh9sW/aem.png",
  facebook: "https://i.ibb.co/Sv6tXjJ/facebook2x.png",
  instagram: "https://i.ibb.co/qWJZMkV/instagram2x.png",
};
const attachments = [
  {
    filename: "aem.png",
    path: path.join(
      path.dirname(require.main.filename),
      "emails/images",
      "aem.png"
    ),
    cid: "aem@cid",
  },
  {
    filename: "facebook2x.png",
    path: path.join(
      path.dirname(require.main.filename),
      "emails/images",
      "facebook2x.png"
    ),
    cid: "facebook2x@cid",
  },
  {
    filename: "instagram2x.png",
    path: path.join(
      path.dirname(require.main.filename),
      "emails/images",
      "instagram2x.png"
    ),
    cid: "instagram2x@cid",
  },
];
const functions = {
  isValidToken: (token, type) => {
    var res;
    if (!token || !type) res = false;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded._id || decoded.type !== type) res = false;
      else res = decoded;
    } catch (err) {
      res = false;
    }
    return res;
  },
  generateToken: (exp = "7d", type = "auth", data) => {
    var token;
    data.type = type;
    token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: exp });
    return token;
  },
  validRestPassToken: (token) => {
    if (!token) return false;
    return jwt.verify(token, process.env.JWT_SECRET, (err, succ) => {
      if (err && err.name == "TokenExpiredError") return { expired: true };
      if (!succ) return false;
      else {
        // console.log(succ)
        if (!succ.id || !succ.email) return false;
        else return succ;
      }
    });
  },
  encrypt: (s) => {
    const key = crypto.createCipher("aes-128-cbc", process.env.JWT_SECRET);
    let data = key.update(s, "utf8", "hex");
    data += key.final("hex");
    return data;
  },
  decrypt: (s) => {
    const key = crypto.createDecipher("aes-128-cbc", process.env.JWT_SECRET);
    let data = key.update(s, "hex", "utf8");
    data += key.final("utf8");
    return data;
  },
  email: {
    sendConfirmationEmail: (user) => {
      let email = new Email({
        message: {
          from: '"Team AEM" <organize@aemeeting.org>',
          replyTo: "support@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      email.send({
        template: "confirmation",
        message: {
          to: user.email,
          text: `Last step and then enjoy our services`,
        },
        locals: {
          name: user.first,
          url: process.env.CLIENT_URL + "/verify/" + user.token,
          year: new Date().getFullYear(),
          id: Math.floor(Math.random() * (9999 - 1000) + 1000),
          images,
        },
      });
    },
    resendConfirmationEmail: (user) => {
      let email = new Email({
        message: {
          from: '"Team AEM" <organize@aemeeting.org>',
          replyTo: "support@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      email.send({
        template: "resendConfirmation",
        message: {
          to: user.email,
          text: `Please confirm your new email`,
        },
        locals: {
          name: user.first,
          url: process.env.CLIENT_URL + "/verify/" + user.token,
          year: new Date().getFullYear(),
          id: Math.floor(Math.random() * (9999 - 1000) + 1000),
          images,
        },
      });
    },
    sendNewEvents: async (events, office) => {
      if (!(events || []).length) return;
      let email = new Email({
        message: {
          from: '"Team AEM | New Event" <organize@aemeeting.org>',
          replyTo: "no-reply@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      const User = require("../models/user");
      // to be optimized for deferent offices
      if (!office) office = events[0].office;
      const users = await User.find(
        { followOffice: office, confirmed: true, subscribed: true },
        "first email"
      );
      console.log(users)
      if (!users) return;
      users.forEach((user) => {
        email.send({
          template: "newEvent",
          message: {
            to: user.email,
            text: `${user.first}, there is some fresh events for you... Don't miss them`,
          },
          locals: {
            name: user.first,
            id: user._id,
            eid: functions.encrypt(user.email),
            year: new Date().getFullYear(),
            events,
            images,
          },
        });
      });
    },
    sendEventChangements: async (event, newEvent) => {
      let fields;
      if (!newEvent.startsOn || !newEvent.endsOn || !newEvent.location)
        return null;
      if (
        (newEvent.startsOn !== event.startsOn.toISOString() ||
          newEvent.endsOn !== event.endsOn.toISOString()) &&
        JSON.stringify(newEvent.location) !== JSON.stringify(event.location)
      ) {
        fields = "Date and Location";
      } else if (
        newEvent.startsOn !== event.startsOn.toISOString() ||
        newEvent.endsOn !== event.endsOn.toISOString()
      ) {
        fields = "Date";
      } else if (
        JSON.stringify(newEvent.location) !== JSON.stringify(event.location)
      ) {
        fields = "Location";
      } else return null;
      const orders = await Order.find({ event: event._id }, "user").populate(
        "user",
        "email first"
      );
      const email = new Email({
        message: {
          from:
            '"Team AEM | Important!, Event changements" <organize@aemeeting.org>',
          replyTo: "no-reply@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      orders.forEach((order) => {
        if (!order.user || !order.user.email) return null;
        email.send({
          template: "eventChanged",
          message: {
            to: order.user.email,
            text: `${order.user.first}, "${newEvent.subject}" Event's ${fields} has changed`,
          },
          locals: {
            name: order.user.first,
            fields,
            year: new Date().getFullYear(),
            event: newEvent,
            images,
          },
        });
      });
      // orders.forEach((order) => {
      //   if (!order.user.email) return null;
      //   email.send({
      //     message: {
      //       to: "hakim.bhd@gmail.com",
      //       text: `${"Hakim"}, "${
      //         newEvent.subject
      //       }" Event's ${fields} has changed`,
      //     },
      //     locals: {
      //       name: "Hakim",
      //       fields,
      //       year: new Date().getFullYear(),
      //       event: newEvent,
      //     },
      //   });
      // });
    },
    sendResetPass: (data) => {
      let email = new Email({
        message: {
          from: '"Team AEM | Reset Password" <organize@aemeeting.org>',
          replyTo: "support@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      email.send({
        template: "resetPassword",
        message: {
          to: data.email,
        },
        locals: {
          url: process.env.CLIENT_URL + "/reset/" + data.token,
          name: data.name,
          year: new Date().getFullYear(),
          id: Math.floor(Math.random() * (9999 - 1000) + 1000),
          images,
        },
      });
    },
    sendEventReminder: (event) => {
      let qr;
      const tickets = event.tickets;
      if (!event || !tickets) return;
      let email = new Email({
        message: {
          from: '"Team AEM | Event Reminder" <organize@aemeeting.org>',
          replyTo: "no-reply@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      tickets.forEach(async (ticket) => {
        if (!ticket.user || !ticket.user.confirmed) return;
        qr = await QRCode.toDataURL(ticket._id);
        const buffer = new Buffer.from(qr.split("base64,")[1], "base64");
        const attachments = [
          {
            filename: "TICKET-" + ticket._id + ".jpg",
            content: buffer,
            encoding: "base64",
            cid: "ticket@cid",
          },
        ];
        email.send({
          template: "eventReminder",
          message: {
            to: ticket.user.email,
            text: `${ticket.user.first}, Dont forget the ${event.subject} event tomorrow`,
            attachments,
          },
          locals: {
            name: ticket.user.first,
            year: new Date().getFullYear(),
            images,
          },
        });
      });
    },
    sendEventTicket: async (ticket) => {
      let qr;
      let email = new Email({
        message: {
          from: `"Team AEM | Ticket for ${ticket.event.subject} event" <organize@aemeeting.org>`,
          replyTo: "no-reply@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      qr = await QRCode.toDataURL(ticket._id);
      const buffer = new Buffer.from(qr.split("base64,")[1], "base64");
      const attachments = [
        {
          filename: "TICKET-" + ticket._id + ".jpg",
          content: buffer,
          encoding: "base64",
          cid: "ticket@cid",
        },
      ];
      email.send({
        template: "eventTicket",
        message: {
          to: ticket.user.email,
          text: `You are ready 😎 to attend ${ticket.event.subject} Event`,
          attachments,
        },
        locals: {
          name: ticket.user.first,
          year: new Date().getFullYear(),
          event: ticket.event,
          images,
        },
      });
    },
    sendUserBlocked: async (user) => {
      let email = new Email({
        message: {
          from: '"Team AEM | Account suspended" <organize@aemeeting.org>',
          replyTo: "no-reply@aemeeting.org",
        },
        send: true,
        preview: false,
        transport: {
          host: "premium63.web-hosting.com",
          port: 465,
          ssl: true,
          tls: true,
          auth: {
            user: process.env.EMAIL_USERNAME, // your Mailtrap username
            pass: process.env.EMAIL_PASSWORD, //your Mailtrap password
          },
        },
      });
      const options = {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      email.send({
        template: "userBlocked",
        message: {
          to: user.email,
          text: `Your account is blocked untill ${user.blocked.toLocaleDateString(
            "en-US",
            options
          )}`,
        },
        locals: {
          name: user.first,
          year: new Date().getFullYear(),
          date: user.blocked.toLocaleDateString("en-US", options),
          images,
        },
      });
    },
  },
};

module.exports = functions