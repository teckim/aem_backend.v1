const pdf = require("pdfkit");
const QRCode = require("qrcode");

pdf.prototype.generatePdfTicket = async function (ticket) {
  const qr = await QRCode.toDataURL(ticket._id);
  const qrData = new Buffer.from(qr.split("base64,")[1], "base64");
  this
    .fillColor("#ee8b5d")
    .fontSize(18)
    .font("Helvetica")
    .text("ALGERIA ENGLISH MEETING", 10, 19)

    .rect(10, 20, 190, 70)
    .fontSize(18)
    .fillColor("#000")
    .font("Helvetica")
    .text(ticket.event.subject, 12, 30)
    .text("Participation ticket", 198, 30, {
      align: "right",
    })
    .fontSize(10)
    .fillColor("#646464")
    .text("token on " + ticket.event.createdOn, 198, 35, {
      align: "right",
    })

    .fontSize(10)
    .fillColor("#646464")
    .text(ticket.event.project.title, 12, 35)

    .fontSize(14)
    .fillColor("#000")
    .text(ticket.user.first + " " + ticket.user.last.toUpperCase(), 12, 55)
    .fontSize(10)
    .fillColor(100)
    .text(ticket.event.startsOn, 12, 60)

    .fontSize(14)
    .fillColor("#000")
    .text(ticket.event.location.name, 12, 80)
    .fontSize(10)
    .fillColor("#646464")
    .text(ticket.event.location.address, 12, 85)

    .image(qrData, 168, 55, { width: 30, height: 30 })

    .fontSize(10)
    .fillColor("#000")
    .text("ticket id: #" + ticket._id, 10, 94)

    .fontSize(20)
    .text("Note: ", 10, 120)
    .fontSize(12)
    .text(
      "We really appreciate being present at the event since you got a ticket,\nother ways please make sure you cancel it. \n5 tickets not checked in my cause you being banned from our events for a while.",
      10,
      125
    );
  return this;
};
module.exports = pdf;
