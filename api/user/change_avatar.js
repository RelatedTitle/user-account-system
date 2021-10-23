// TODO:
// Add different options for uploading avatars. S3, local, new Cloudflare images thingy, etc.

const router = require("express").Router();

const db = require("../../db/db.js");
const passport = require("passport");
const config = require("../../config.js");
const multer = require("multer");

const avatar = require("../../util/avatar.js");

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

router.post(
  "/user/upload_avatar",
  upload.single("avatar"),
  passport.authenticate("jwt", { failWithError: true, session: false }),
  async (req, res, next) => {
    let avatar_url;
    // Process and store the avatar.
    try {
      avatar_url = await avatar.upload_avatar(req.file.buffer);
    } catch (error) {
      return res.status(400).json({ error: true, message: error });
    }
    // Store avatar url in database.
    try {
      await db.user.update(
        { avatar_url: avatar_url },
        { where: { userid: req.user._id } }
      );
    } catch (error) {
      return res
        .status(400)
        .json({ error: true, message: "Failed to update user." });
    }
    return res
      .status(200)
      .json({ error: false, message: "Avatar uploaded successfully." });
  },
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: true, message: err });
  }
);

module.exports = router;
