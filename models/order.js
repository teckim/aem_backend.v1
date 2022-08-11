const mongoose = require("mongoose");
const shortid = require("shortid");

const Schema = mongoose.Schema;
let orderSchema = new Schema({
  _id: { type: String, required: true, default: shortid, immutable: true },
  event: { type: mongoose.Types.ObjectId, required: true, ref: "Event" },
  user: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  paid: { type: Number, default: 0 },
  checkedIn: { type: Boolean, default: false },
  createdOn: { type: Date, default: Date.now },
  note: { type: String, trim: true },
  table: { type: Number },
});
orderSchema.index({ _id: 1, event: 1 }, { unique: true });

let Order = mongoose.model("Sales", orderSchema);

module.exports = Order;
