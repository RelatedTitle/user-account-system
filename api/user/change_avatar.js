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
  "/user/change_avatar",
  upload.single("avatar"),
  passport.authenticate("jwt", { failWithError: true, session: false }),
  async (req, res, next) => {
    let avatar_url;
    // Process and store the avatar.
    try {
      avatar_url = await avatar.upload_avatar(req.file.buffer);
    } catch (error) {
      return res.status(400).json({ error: true, message: error.message });
    }
    // Store avatar url in database.
    try {
      await db.user.update(
        { avatar_url: avatar_url },
        { where: { userid: req.user._id } }
      );
    } catch (error) {
      return res.status(400).json({ error: true, message: error.message });
    }
    return res
      .status(200)
      .json({ error: false, message: "Avatar uploaded successfully." });
  }
);

module.exports = router;
