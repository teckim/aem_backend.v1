const mongoose = require("mongoose");
const user = require("./user");
const Schema = mongoose.Schema;
let officeSchema = new Schema(
  {
    name: { type: String, required: true },
    province: { type: String, required: true },
    country: { type: String, required: true },
    currency: { type: String, required: true },
    vacant: { type: Boolean, default: false },
    tasks: { type: Array },
    createdBy: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
      immutable: true,
    },
    createdOn: { type: Date, default: Date.now },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    id: false,
  }
);
officeSchema.virtual("members", {
  ref: "User",
  localField: "_id",
  foreignField: "office",
  options: {
    projection: "first last email",
    lean: true
  }
});
officeSchema.pre("save", async function () {
  var office = this;
  office.country = office.country
    .replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    })
    .replace(/\s+/g, "")
    .trim();
  office.province = office.province
    .replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    })
    .replace(/\s+/g, "")
    .trim();
});

let Office = mongoose.model("Office", officeSchema);

module.exports = Office;
