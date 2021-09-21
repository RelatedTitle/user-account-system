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
