const User = require("../../models/user");
const Office = require("../../models/office");
const Orders = require("../../models/order");

const auth = require("../middleware/auth");
const ac = require("../../roles");
const requirePassword = require("../middleware/requirePassword");
const {
  generateToken,
  isValidToken,
  email,
  decrypt,
} = require("../../plugins/helpers");
// const roles = require("../../roles");
// const Email = require("email-templates");

module.exports = (router) => {
  router.get("/users/test", async (req, res) => {
    let user = await User.findById("5eb58437ce620e23a2bce820");
    let blocked = await user.isBlocked();
    console.log(blocked);
    email.sendUserBlocked(user.toJSON());
    res.send(user);
  });
  // GET REQUESTS:
  // GET user:
  router.get("/users", auth, (req, res) => {
    const decoded = res.locals.decoded;
    if (decoded.role !== "root") return res.sendStatus(403);
    const page = JSON.parse(req.query.page);
    const limit = parseInt(page.limit);
    delete req.query.page;
    const query = new RegExp(".*" + (req.query.filter || "") + ".*", "i");
    const filter = {
      $or: [
        { email: { $regex: query } },
        { first: { $regex: query } },
        { last: { $regex: query } },
      ],
    };
    User.paginate(filter, {
      page: parseInt(page.number),
      limit,
      lean: true,
      sort: "-createdOn",
      populate: [
        { path: "office", select: "currency province country name" },
        { path: "checkedTicketsCount" },
        { path: "uncheckedTicketsCount" },
      ],
    })
      // User.find({}, "-password")
      //   // .populate("office", "currency province country name")
      //   .populate("office", "currency name")
      //   .populate("checkedTicketsCount")
      //   .populate("uncheckedTicketsCount")
      //   .lean({ virtuals: true })
      //   .exec()
      .then((users) => res.status(200).json({ users }))
      .catch((err) => {
        res.status(500).send(err);
      });
  });
  // GET user by id:
  // router.get("/users/:id", auth, (req, res) => {
  //   const decoded = res.locals.decoded;
  //   const permission = ac.can(decoded.role).readAny("user");
  //   if (!permission.granted) return res.sendStatus(403);
  //   User.findById(res.locals.decoded._id, "-password")
  //     .lean()
  //     .exec()
  //     .then((user) => res.status(200).json({ user }))
  //     .catch((err) => {
  //       res.status(500).send(err);
  //       console.log(err);
  //     });
  // });
  // GET user:
  router.get("/users/user", auth, (req, res) => {
    User.findById(res.locals.decoded._id, "-password")
      // .populate("office", "currency province country name")
      .populate("office", "currency name")
      .lean()
      .exec()
      .then((user) => res.status(200).json({ user }))
      .catch((err) => {
        res.status(500).send(err);
        console.log(err);
      });
  });
  // send verification email
  router.get("/users/send-verification", auth, (req, res) => {
    User.findById(res.locals.decoded._id, "email first last confirmed")
      .lean()
      .then((user) => {
        if (!user) return res.status(500).json({ message: "No user found!" });
        if (user.confirmed) return res.sendStatus(208);
        try {
          user.token = generateToken("1d", "verify-account", {
            _id: user.email,
          });
          email.sendConfirmationEmail(user);
          res.sendStatus(200);
        } catch (err) {
          res.status(500).json({
            message: "Error resending verification email, please try again",
          });
        }
      });
  });
  // send reset password email
  router.get("/users/send-reset-pass", (req, res) => {
    User.findOne({ email: req.query.email }, "email first last").then(
      (user) => {
        if (!user) return res.status(500).json({ message: "No user found!" });
        try {
          let data = {
            email: user.email,
            name: user.first,
            token: user.generateToken("1h", "reset-password"),
          };
          email.sendResetPass(data);
          res.sendStatus(200);
        } catch (err) {
          res.status(500).json({
            message: "Error resending verification email, please try again",
          });
        }
      }
    );
  });
  // get follows
  // send reset password email
  router.get("/users/follows", auth, (req, res) => {
    User.findById(res.locals.decoded._id, "followOffice")
      .populate("followOffice", "name province country")
      .then((user) => {
        if (!user) return res.sendStatus(500);
        res.json({ offices: user.followOffice });
      });
  });
  // get user by email:
  router.get(
    "/users/:email",
    (req, res, next) => {
      if (req.query.type === "count") {
        User.countDocuments({
          email: {
            $regex: new RegExp("^" + req.params.email + "$", "i"),
          },
        })
          .exec()
          .then((count) => {
            res.status(200).json({ exists: count });
          })
          .catch((err) => res.status(500).json(err));
      } else next();
    },
    auth,
    (req, res) => {
      const decoded = res.locals.decoded;
      const permission = ac.can(decoded.role).readAny("user");
      if (!permission.granted) return res.sendStatus(403);
      User.findOne({
        email: {
          $regex: new RegExp("^" + req.params.email + "$", "i"),
        },
      })
        .exec()
        .then((user) => {
          res.status(200).json({ user });
        })
        .catch((err) => res.status(500).json(err));
    }
  );
  // GET user by id:
  router.get("/users/user/:id", auth, (req, res) => {
    const decoded = res.locals.decoded;
    if (decoded.role !== "root") return res.sendStatus(403);
    User.findById(req.params.id, "-password")
      .populate("office", "currency name province country")
      .populate("followOffice", "name province country")
      .populate("checkedTicketsCount")
      .populate("uncheckedTicketsCount")
      .lean({ virtuals: true })
      .exec()
      .then((user) => res.status(200).json({ user }))
      .catch((err) => {
        res.status(500).send(err);
        console.log(err);
      });
  });
  // POST REQUESTS:
  // add new user
  router.post("/users", (req, res) => {
    const data = req.body;
    delete data.office;
    delete data.role;
    delete data.followOffice;
    delete data.blocked;
    const user = new User(data);
    user.$new = true;
    user
      .save()
      .then((user) => {
        res.sendStatus(200);
        user.token = user.generateToken("1d", "verify-account");
        email.sendConfirmationEmail(user);
      })
      .catch(() => {
        res.status(500).json({ message: "Error registering user" });
      });
  });
  // user login
  router.post("/users/login", (req, res) => {
    if (!req.body.user.email || !req.body.user.password) {
      return res.status(400).json({ message: "Empty email or password" });
    }
    User.findOne(
      {
        email: {
          $regex: new RegExp("^" + req.body.user.email + "$", "i"),
        },
      },
      "password role office"
    ).then((user) => {
      if (!user || !user.validPassword(req.body.user.password)) {
        return res.status(400).json({ message: "Wrong email or password" });
      }
      res.json({ token: user.generateToken() });
    });
  });
  // verify user token
  router.post("/users/token", (req, res) => {
    const payload = req.body;
    if (!payload.token || !payload.type)
      return res.status(400).json({ message: "Token and token type required" });
    const valid = isValidToken(payload.token, payload.type);
    if (valid) res.sendStatus(200);
    else res.status(400).json({ message: "Token expired or invalid" });
  });
  // delete user:
  router.post("/users/delete", auth, requirePassword, (req, res) => {
    User.findByIdAndDelete(res.locals.decoded._id)
      .then(() => res.sendStatus(200))
      .catch(() => res.status(500).json({ message: "Error deleting account" }));
  });

  // PUT requests:
  // Update user info
  router.put("/users", auth, async (req, res) => {
    let newUser = req.body;
    const user = await User.findById(res.locals.decoded._id);
    if (!user) return res.status(500).json({ message: "No account found" });
    Object.assign(user, newUser);
    user.$new = false;
    user
      .save()
      .then(() => {
        res.sendStatus(200);
      })
      .catch(() => {
        res.status(500).json({ message: "Error registering user" });
      });
  });
  // Update user email
  router.put("/users/email", auth, requirePassword, async (req, res) => {
    const newEmail = req.body.email;
    if (!newEmail) return res.status(400).json({ message: "Email required" });

    const user = res.locals.user;
    if (user.email.toLowerCase() === newEmail.toLowerCase())
      return res.status(400).json({ message: "Same old email, no changes" });

    const exists = await User.countDocuments({
      email: { $regex: new RegExp("^" + newEmail + "$", "i") },
    });
    if (exists)
      return res
        .status(500)
        .json({ message: "Email already in use, use another one" });

    user.email = newEmail;
    user.confirmed = false;
    user.$new = false;
    user
      .save()
      .then((user) => {
        res.sendStatus(200);
        user.token = user.generateToken("1d", "verify-account");
        email.resendConfirmationEmail(user);
      })
      .catch(() => {
        res.status(500).json({ message: "Error registering user" });
      });
  });
  // Update user password
  router.put("/users/password", auth, requirePassword, async (req, res) => {
    const newPassword = req.body.newPassword;
    const password = req.body.password;
    if (!newPassword)
      return res.status(400).json({ message: "Empty new password" });
    if (password === newPassword)
      return res.status(400).json({ message: "Same old password, no changes" });

    const user = res.locals.user;
    user.password = newPassword;
    user.$new = true;
    user
      .save()
      .then(() => {
        res.sendStatus(200);
      })
      .catch(() => {
        res.status(500).json({ message: "Error updating password" });
      });
  });
  // Update user subscription
  router.put("/users/subscription", async (req, res) => {
    const action = req.body.action;
    if (action !== "subscribe" && action !== "unsubscribe")
      return res.sendStatus(400);
    const eid = req.body.eid;
    const id = req.body.id;
    if (!eid || !id) return res.sendStatus(503);
    try {
      const user = await User.findById(id, "-password");
      if (!user || user.email !== decrypt(eid)) return res.sendStatus(400);
      if (action === "subscribe") {
        if (user.subscribed) return res.send(user);
        user.subscribed = true;
      } else {
        if (!user.subscribed) return res.send(user);
        user.subscribed = false;
      }
      user.save();
      res.send(user);
    } catch (e) {
      res.sendStatus(400);
    }
  });
  // Update user blocking
  router.put("/users/blocking", auth, (req, res) => {
    const decoded = res.locals.decoded;
    if (decoded.role !== "root") return res.sendStatus(403);
    const id = req.body.id;
    if (!id) return res.sendStatus(503);
    User.findByIdAndUpdate(id, { blocked: new Date(req.body.date) })
    .then(() => res.send())
    .catch((e) => res.send(e))
  });
  // Update user password
  router.put("/users/password/reset", async (req, res) => {
    const password = req.body.password;
    const token = req.body.token;
    if (!password || !token)
      return res.status(400).json({ message: "Password and token required" });
    const decoded = isValidToken(token, "reset-password");
    if (!decoded)
      return res.status(400).json({ message: "Token expired or invalid" });

    const user = await User.findById(decoded._id);
    if (!user)
      return res.status(500).json({ message: "Somehow, No account found" });
    user.password = password;
    user.$new = true;
    user
      .save()
      .then((user) => {
        res.status(200).json({ email: user.email });
      })
      .catch(() => {
        res.status(500).json({ message: "Error updating password" });
      });
  });
  // Follow office
  router.put("/users/offices/:id/following", auth, async (req, res) => {
    const officeId = req.params.id;
    const userId = res.locals.decoded._id;
    const action = req.query.action;
    const user = await User.findById(userId, "followOffice").exec();
    if (!user) return res.sendStatus(500);
    try {
      if (action === "follow") {
        if (user.followOffice.includes(officeId)) return res.sendStatus(200);
        await User.findByIdAndUpdate(userId, {
          $push: { followOffice: officeId },
        }).exec();
        res.sendStatus(200);
      } else if (action === "unfollow") {
        if (!user.followOffice.includes(officeId)) return res.sendStatus(200);
        await User.findByIdAndUpdate(userId, {
          $pull: { followOffice: officeId },
        }).exec();
        res.sendStatus(200);
      }
    } catch (err) {
      res.status(500).json({
        message: `An error occured while trying to ${action} the team`,
      });
    }
  });
  // verify user account
  router.put("/users/verify", auth, async (req, res) => {
    const user = await User.findById(res.locals.decoded._id).lean();
    if (!user) return res.status(500).json({ message: "No account found" });

    const token = isValidToken(req.query.token, "verify-account");
    if (!token)
      return res.status(400).json({ message: "Token expired or invalid" });
    if (user.email !== token._id)
      return res
        .status(400)
        .json({ message: "Token doesn't belong to your account" });
    if (user.confirmed) return res.sendStatus(208);

    User.findOneAndUpdate({ email: token._id }, { $set: { confirmed: true } })
      .then(() => {
        res.sendStatus(200);
      })
      .catch(() => {
        res
          .status(500)
          .json({ message: "Something went wrong verifying your account" });
      });
  });
};
