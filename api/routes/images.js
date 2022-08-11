const auth = require("../middleware/auth");
const multer = require("multer");
var fs = require("fs");
const path = require("path");
const Jimp = require("jimp");
// const sharp = require("sharp");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "." + file.mimetype.split("/")[1]);
  },
});

const upload = multer({ storage: storage });

module.exports = (router) => {
  // GET REQUESTS:
  // get images names
  router.get("/images", auth, (req, res) => {
    const directoryPath = path.join(process.cwd(), "./uploads/images/");
    fs.readdir(directoryPath, function (err, files) {
      //handling error
      if (err) {
        return res
          .status(500)
          .json({ err: "Unable to scan directory: " + err });
      }
      const EXTENSIONS = [".png", ".jpg", ".jpeg", ""];
      const images = files.filter(function (file) {
        return EXTENSIONS.includes(path.extname(file).toLowerCase());
      });
      images.shift();

      res.json(images);
      //   files.forEach(function (file) {
      //     // Do whatever you want to do with the file
      //     console.log(file);
      //   });
    });
  });
  router.get("/images/:image", (req, res) => {
    let w = Number(req.query.w);
    let q = Number(req.query.q)
    if (!w) w = 300;
    if (!q) q = 80
    Jimp.read(
      path.join(process.cwd(), "./uploads/images/", req.params.image),
      (err, image) => {
        if (err) {
          res.sendStatus(500);
        } else {
          image.resize(w, Jimp.AUTO).quality(q).getBuffer(Jimp.AUTO, (err, pic) => {
            res.contentType(image.getMIME()).end(pic);
          });
        }
      }
    );
  });
  // get image info
  router.get("/images/info/:name", auth, (req, res) => {
    const imagePath = path.join(
      process.cwd(),
      "./uploads/images/" + req.params.name
    );
    fs.stat(imagePath, function (err, stats) {
      res.json({ size: stats.size, createdOn: stats.birthtime });
    });
  });
  // POST REQUESTS:
  // post new image
  router.post("/images", auth, upload.single("image"), (req, res) => {
    if (!req.file) {
      res
        .status(500)
        .json({ message: "Error uploading the image, please try again" });
    } else {
      res.status(200).json({
        message: "uploaded succefully",
        file: req.file,
      });
    }
  });
};
