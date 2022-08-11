const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const path = require("path");
const fs = require("fs");

const Order = require("./order.js");
const Schema = mongoose.Schema;
let eventSchema = new Schema(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      immutable: true,
    },
    project: { type: Schema.Types.ObjectId, required: true, ref: "Project" },
    sponsors: [{ type: Schema.Types.ObjectId, ref: "Sponsor" }],
    office: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Office",
      immutable: true,
    },
    image: { type: Object },
    createdOn: { type: Date, default: Date.now, immutable: true },
    startsOn: {
      type: Date,
      required: true,
      validate: [
        {
          validator: function (v) {
            return new Date().getTime() <= v.getTime();
          },
          msg: "Start Date cannot be before current Date",
        },
        {
          validator: function (v) {
            return this.endsOn.getTime() > v.getTime();
          },
          msg: "Start Date cannot be after End Date",
        },
        {
          validator: function (v) {
            return this.endsOn.getTime() - v.getTime() >= 1800000;
          },
          msg: "The Event must be at least 30 min",
        },
      ],
    },
    endsOn: { type: Date, required: true },
    location: { type: Schema.Types.Mixed, required: true },
    subject: { type: String, required: true, maxlength: 50 },
    price: { type: Number, default: 0, immutable: true },
    ticketsNumber: { type: Number, default: 0 },
    maxPerUser: { type: Number, default: 1 },
    about: { type: String, maxlength: 500 },
    suspended: { type: Boolean, default: false },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    id: false,
  }
);
eventSchema.virtual("tickets", {
  ref: "Sales",
  localField: "_id",
  foreignField: "event",
});
eventSchema.virtual("ticketsCount", {
  ref: "Sales",
  localField: "_id",
  foreignField: "event",
  count: true, // Set `count: true` on the virtual
});
eventSchema.virtual("state").get(function () {
  let state = "live";
  if (this.startsOn.getTime() > new Date().getTime()) state = "coming";
  else if (this.endsOn.getTime() < new Date().getTime()) state = "past";
  return state;
});
eventSchema.pre("deleteOne", function (next) {
  Order.deleteMany({ event: this._conditions._id }).exec();
  Event.findById(this._conditions._id, "image")
    .exec()
    .then((event) => {
      fs.unlink(
        path.join(process.cwd(), "/uploads/images/" + event.image.name),
        (err) => {
          if (err) throw err;
        }
      );
      next();
    })
    .catch((err) => console.log(err));
});
eventSchema.plugin(mongoosePaginate);
let Event = mongoose.model("Event", eventSchema);

module.exports = Event;
