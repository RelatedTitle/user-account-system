// TODO:
// Add different options for uploading avatars. S3, local, new Cloudflare images thingy, etc.
// Compress image beforehand and add a configurable file size limit.

const router = require("express").Router();

const db = require("../../db/db.js");
const passport = require("passport");
const config = require("../../config.js");

router.post(
  "/user/upload_avatar",
  passport.authenticate("jwt", { failWithError: true, session: false }),
  (req, res, next) => {},
  function (err, req, res, next) {
    // Handle error
    return res.status(401).send({ error: true, message: err });
  }
);

module.exports = router;
