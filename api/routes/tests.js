const pug = require("pug");
const QRCode = require("qrcode");
const Email = require("email-templates");
const Event = require("../../models/event");
const { encrypt } = require("../../plugins/helpers")

const images = {
  logo: "https://i.ibb.co/2yPh9sW/aem.png",
  facebook: "https://i.ibb.co/Sv6tXjJ/facebook2x.png",
  instagram: "https://i.ibb.co/qWJZMkV/instagram2x.png",
};
const events = [
  {
    _id: "5ea4275389dcb9ae7283405c",
    price: 0,
    ticketsNumber: 20,
    maxPerUser: 1,
    project: {
      name: "COFFEE MEETUP",
    },
    subject: "Debate Club",
    image: {
      name: "1160b2c2241601d0d2b345561c558212",
      type: "image/png",
    },
    location: {
      address: "Online",
      name: "Zoom application",
    },
    startsOn: new Date("2020-04-26T21:00:00.000Z"),
    endsOn: new Date("2020-04-26T22:30:00.000Z"),
    createdBy: "5e5c0455d204e053f3a916ed",
    office: "5e2a2a84297b1700042e7f31",
    createdOn: "2020-04-25T12:04:35.407Z",
  },
  {
    _id: "5eb00e18132cfa0ce3353ec9",
    price: 0,
    ticketsNumber: 25,
    maxPerUser: 1,
    project: {
      name: "COFFEE MEETUP",
    },
    subject: "Movie Club",
    image: {
      name: "595d54e1f897e41ae6ea006f86be7413",
      type: "image/png",
    },
    location: {
      address: "Online",
      name: "Zoom application",
    },
    startsOn: new Date("2020-05-05T21:00:00.000Z"),
    endsOn: new Date("2020-05-05T22:30:00.000Z"),
    createdBy: "5e5c0455d204e053f3a916ed",
    office: "5e2a2a84297b1700042e7f31",
    createdOn: "2020-05-04T12:44:08.264Z",
  },
  {
    _id: "5ee8cc5921c4e14c9034a425",
    price: 250,
    ticketsNumber: 50,
    maxPerUser: 1,
    available: true,
    project: {
      name: "COFFEE MEETUP",
    },
    subject: "Webinar - Nadia DZHALAVIAN",
    location: {
      address: "Online",
      name: "Zoom application",
    },
    about:
      "In this webinar Nadia will talk about IELTS exam and all tips and tricks of how to pass it.",
    startsOn: new Date("2020-06-27T19:00:00.000Z"),
    endsOn: new Date("2020-06-27T21:00:00.000Z"),
    image: {
      name: "1591312284750.jpeg",
    },
    createdOn: "2020-06-04T23:11:42.957Z",
    createdBy: "5e5c0455d204e053f3a916ed",
    office: "5e2a2a84297b1700042e7f31",
  },
];
const users = [
  {
    _id: "5e2c2e963ab76d0004f37b7b",
    student: false,
    subscribed: true,
    confirmed: true,
    followOffice: ["5e2a2a84297b1700042e7f31"],
    role: "user",
    first: "hakim",
    last: "BHD",
    b_day: "1996-12-13T00:00:00.000Z",
    gender: "M",
    major: null,
    email: "hakim.bhd@gmail.com",
    phone: "(213)557057577",
    password: "$2b$10$zwegX/N.8zBwBbv1HT8WkOFFFKTG8eoiaAK.y7MQoNlVcQca24agu",
    createdOn: "2020-01-25T12:03:34.786Z",
  },
];
const ticket = {
  _id: "5e343d4afde4bc2b6a618cb4",
  paid: 0,
  checkedIn: true,
  event: events[0],
  user: users[0],
  createdOn: "2020-01-31T14:44:26.034Z",
  __v: 0,
};
module.exports = (router) => {
  router.get("/tests/emails/eventChangement", async (req, res) => {
    // Compile the source code
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/eventChanged/html.pug"
    );
    res.send(
      compiledFunction({
        name: "Timothy",
        fields: "Date",
        event: events[0],
        year: "2020",
        images,
      })
    );
  });
  router.get("/tests/emails/confirmation", async (req, res) => {
    // Compile the source code
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/confirmation/html.pug"
    );
    res.send(
      compiledFunction({
        name: users[0].first,
        url:
          "https://www.aemeeting.org" +
          "/verify/" +
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJoYWtpbS5iaGRAZ21haWwuY29tIiwidHlwZSI6InZlcmlmeS1hY2NvdW50IiwiaWF0IjoxNTg5MDMxNjQzLCJleHAiOjE1ODkxMTgwNDN9.hfYiMgljr20fSYwvSaTYM8q8ONDQpEV56IdS7Z1oQwU",
        year: "2020",
        images,
      })
    );
  });
  router.get("/tests/emails/newEvent", async (req, res) => {
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/newEvent/html.pug"
    );
    res.send(
      compiledFunction({
        name: users[0].first,
        id: users[0]._id,
        eid: encrypt(users[0].email),
        year: new Date().getFullYear(),
        events,
        images,
      })
    );
  });
  router.get("/tests/emails/resendConfirmation", async (req, res) => {
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/resendConfirmation/html.pug"
    );
    res.send(
      compiledFunction({
        name: users[0].first,
        url:
          "https://www.aemeeting.org" +
          "/verify/" +
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJoYWtpbS5iaGRAZ21haWwuY29tIiwidHlwZSI6InZlcmlmeS1hY2NvdW50IiwiaWF0IjoxNTg5MDMxNjQzLCJleHAiOjE1ODkxMTgwNDN9.hfYiMgljr20fSYwvSaTYM8q8ONDQpEV56IdS7Z1oQwU",
        year: new Date().getFullYear(),
        images,
      })
    );
  });
  router.get("/tests/emails/resetPassword", async (req, res) => {
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/resetPassword/html.pug"
    );
    res.send(
      compiledFunction({
        name: users[0].first,
        url:
          "https://www.aemeeting.org" +
          "/reset/" +
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJoYWtpbS5iaGRAZ21haWwuY29tIiwidHlwZSI6InZlcmlmeS1hY2NvdW50IiwiaWF0IjoxNTg5MDMxNjQzLCJleHAiOjE1ODkxMTgwNDN9.hfYiMgljr20fSYwvSaTYM8q8ONDQpEV56IdS7Z1oQwU",
        year: new Date().getFullYear(),
        images,
      })
    );
  });
  router.get("/tests/emails/eventReminder", async (req, res) => {
    const qr = await QRCode.toDataURL("5x9skaWEW");
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/eventReminder/html.pug"
    );
    res.send(
      compiledFunction({
        name: users[0].first,
        year: new Date().getFullYear(),
        qr,
        images,
      })
    );
  });
  router.get("/tests/emails/eventTicket", async (req, res) => {
    const qr = await QRCode.toDataURL("5x9skaWEW");
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/eventTicket/html.pug"
    );
    res.send(
      compiledFunction({
        name: users[0].first,
        year: new Date().getFullYear(),
        event: events[0],
        qr,
        images,
      })
    );
  });
  router.get("/tests/emails/userBlocked", async (req, res) => {
    const compiledFunction = pug.compileFile(
      "/Users/air/Documents/AEM/aem website v2/server.v2/emails/userBlocked/html.pug"
    );
    res.send(
      compiledFunction({
        name: users[0].first,
        year: new Date().getFullYear(),
        event: events[0],
        images,
      })
    );
  });
  // 5ed97faeb31f39c1f6614006
  router.get("/tests/cron", (req, res) => {
    const event = Event.findById(id)
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
    
    // const schedule = require('node-schedule');
    // schedule.scheduleJob(data, async function (id){
    //   const event = Event.findById(id).

    // }.bind(null, '5ed97faeb31f39c1f6614006'))
  });
  // test pdf attachment emails
  router.get("/tests/sendemail/eventTicket", async (req, res) => {
    const qr = await QRCode.toDataURL("5x9skaWEW");
    var buffer = new Buffer.from(qr.split("base64,")[1], "base64");
    const attachments = [
      {
        filename: "ticket-" + ticket._id + ".jpg",
        content: buffer,
        encoding: "base64",
        cid: "ticket@cid",
      },
    ];
    let email = new Email({
      message: {
        from: '"Team AEM | Entry ticket" <organize@aemeeting.org>',
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
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
    });
    email.send({
      template: "eventTicket",
      message: {
        to: ticket.user.email,
        text: `${ticket.user.first}!,😎 You are ready to attend ${ticket.event.subject} Event`,
        attachments,
      },
      locals: {
        name: ticket.user.first,
        year: new Date().getFullYear(),
        event: events[0],
        qr,
        images,
      },
    });
    res.send("success");
  });
};
