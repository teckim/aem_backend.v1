const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const uniqueValidator = require("mongoose-unique-validator");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const Order = require("./order");
const { generateToken, email } = require("../plugins/helpers");
const crypt = require("bcrypt");

const Schema = mongoose.Schema;
let userSchema = new Schema(
  {
    first: { type: String, required: true, maxlength: 50 },
    last: { type: String, required: true, maxlength: 50 },
    b_day: { type: Date },
    gender: { type: String, required: true, enum: ["M", "F"] },
    major: { type: String },
    student: { type: Boolean, default: true },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9 _]+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+[ ]*$/.test(
            v
          );
        },
      },
    },
    phone: { type: String, required: true, maxlength: 15, minlength: 12 },
    password: { type: String, required: true },
    subscribed: { type: Boolean, default: true },
    createdOn: { type: Date, default: Date.now },
    confirmed: { type: Boolean, default: false },
    position: { type: String },
    followOffice: [{ type: mongoose.Types.ObjectId, ref: "Office" }],
    role: {
      type: String,
      required: true,
      enum: ["root", "officeAdmin", "officeMember", "user"],
      default: "user",
    },
    office: { type: mongoose.Types.ObjectId, ref: "Office" },
    blocked: { type: Date, default: null },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    id: false,
  }
);
userSchema.virtual("isBirthday").get(function () {
  let isBirthday = false;
  if (!this || !this.b_day) return false
  else if (
    this.b_day.getDate() === new Date().getDate() &&
    this.b_day.getMonth() === new Date().getMonth()
  )
    isBirthday = true;
  return isBirthday;
});
userSchema.virtual("checkedTicketsCount", {
  ref: "Sales",
  localField: "_id",
  foreignField: "user",
  count: true, // Set `count: true` on the virtual
  match: { checkedIn: true },
});
userSchema.virtual("uncheckedTicketsCount", {
  ref: "Sales",
  localField: "_id",
  foreignField: "user",
  count: true, // Set `count: true` on the virtual
  match: { checkedIn: false },
});

userSchema.plugin(uniqueValidator);
userSchema.plugin(mongooseLeanVirtuals);
userSchema.pre("save", async function () {
  var user = this;
  user.email = user.email.toLowerCase().replace(/\s+/g, "").trim();
  user.first = user.first.replace(/\s+/g, " ").trim();
  user.last = user.last.replace(/\s+/g, " ").trim();
  if (user.major) user.major = user.major.replace(/\s+/g, " ").trim();
  if (user.b_day) user.b_day = new Date(user.b_day);
  if (user.$new) {
    user.password = crypt.hashSync(user.password, 10);
  }
  // if (user.$new) {
  //   user.role = "user";
  //   user.office = [];
  //   user.email = user.email.toLowerCase().replace(/\s+/g, "").trim();
  //   user.password = crypt.hashSync(user.password, 10);
  //   user.first = user.first.replace(/\s+/g, " ").trim();
  //   user.last = user.last.replace(/\s+/g, " ").trim();
  //   user.major = user.major ? user.major.replace(/\s+/g, " ").trim() : null;
  //   user.b_day = new Date(user.b_day);
  // }
});

userSchema.methods.validPassword = function (password) {
  var valid = crypt.compareSync(password, this.password);
  return valid;
};
userSchema.methods.generateToken = function (exp = "7d", type = "auth") {
  var token;
  switch (type) {
    case "auth":
      token = generateToken(exp, type, {
        _id: this._id,
        role: this.role,
        office: this.office || "",
      });
      break;
    case "verify-account":
      token = generateToken(exp, type, { _id: this.email });
      break;
    case "reset-password":
      token = generateToken(exp, type, { _id: this._id });
      break;
  }
  return token;
};
userSchema.methods.isBlocked = async function () {
  const date = this.blocked ? this.blocked : this.createdOn;
  const now = new Date();
  // const date = new Date("2020-05-08T16:09:27.715Z")

  if (date.getTime() > now.getTime()) return true;
  const data = await Order.aggregate([
    { $match: { user: mongoose.Types.ObjectId(this._id) } },
    { $match: { checkedIn: false } },
    {
      $lookup: {
        from: "events",
        localField: "event",
        foreignField: "_id",
        as: "passedEvents",
      },
    },
    { $unwind: "$passedEvents" },
    {
      $match: {
        "passedEvents.endsOn": {
          $gte: date,
          $lte: new Date(),
        },
      },
    },
    { $count: "count" },
  ]);
  if (!data.length) return false;
  if (data[0].count >= 3) {
    this.block();
    return true;
  }
};
userSchema.methods.block = async function (days = 10) {
  const now = new Date();
  this.blocked = now.setDate(now.getDate() + days);
  await this.save();
  email.sendUserBlocked(this.toJSON());
};
userSchema.plugin(mongoosePaginate);
let User = mongoose.model("User", userSchema);

module.exports = User;
