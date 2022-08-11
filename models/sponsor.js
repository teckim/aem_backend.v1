const mongoose = require("mongoose");

const Schema = mongoose.Schema;
let sponsorSchema = new Schema({
  name: { type: String, required: true },
  slogan: { type: String },
  image: { type: String, required: true },
  link: { type: String, required: true },
  type: { type: String, required: true, enum: ["official", "platinum", "golden", "silver"], default: "silver" },
  active: { type: Boolean, default: true },
  createdOn: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, required: true ,ref: 'User' },
});

let Sponsor = mongoose.model("Sponsor", sponsorSchema);

module.exports = Sponsor;
