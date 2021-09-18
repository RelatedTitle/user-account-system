const config = require("./config.js");
const db = require("./db/db.js");

async function trustAction(userid, action, data) {
  return new Promise(function (resolve, reject) {
    switch (action) {
      case "emailProvider":
        db.user
          .updateOne(
            { userid: userid },
            {
              $inc: {
                trustscore:
                  config.trustscore.emailProvider[data.emailProvider].points,
              },
              $push: {
                trustactions: {
                  action: "Email",
                  points:
                    config.trustscore.emailProvider[data.emailProvider].points,
                  date: new Date(),
                  data: data,
                },
              },
            }
          )
          .then((updated_user) => {
            resolve(updated_user);
          })
          .catch((err) => {
            reject(err);
          });
        break;
      case "ip":
        break;
      case "accountType":
        db.user
          .updateOne(
            { userid: userid },
            {
              $inc: {
                trustscore:
                  config.trustscore.accountType[data.accountType].points,
              },
              $push: {
                trustactions: {
                  action: "Account Type",
                  points:
                    config.trustscore.accountType[data.accountType].points,
                  date: new Date(),
                  data: data,
                },
              },
            }
          )
          .then((updated_user) => {
            resolve(updated_user);
          })
          .catch((err) => {
            reject(err);
          });
        break;
      case "completedCaptcha":
        db.user
          .updateOne(
            { userid: userid },
            {
              $inc: {
                trustscore: config.trustscore.completedCaptcha.points,
              },
              $push: {
                trustactions: {
                  action: "Completed Captcha",
                  points: config.trustscore.completedCaptcha.points,
                  date: new Date(),
                  data: data,
                },
              },
            }
          )
          .then((updated_user) => {
            resolve(updated_user);
          })
          .catch((err) => {
            reject(err);
          });
        break;
      case "contentVerified":
        if (data.customPointChange) {
          newtrustscore = data.customPointChange;
        } else {
          newtrustscore = config.trustscore.contentVerified.points;
        }
        db.user
          .updateOne(
            { userid: userid },
            {
              $inc: {
                trustscore: newtrustscore,
              },
              $push: {
                trustactions: {
                  action: "Content Verified",
                  points: newtrustscore,
                  date: new Date(),
                  data: data,
                },
              },
            }
          )
          .then((updated_user) => {
            resolve(updated_user);
          })
          .catch((err) => {
            reject(err);
          });
        break;
      case "contentRemoved":
        if (data.customPointChange) {
          newtrustscore = data.customPointChange;
        } else {
          newtrustscore = config.trustscore.contentRemoved.points;
        }
        db.user
          .updateOne(
            { userid: userid },
            {
              $inc: {
                trustscore: newtrustscore,
              },
              $push: {
                trustactions: {
                  action: "Content Removed",
                  points: newtrustscore,
                  date: new Date(),
                  data: data,
                },
              },
            }
          )
          .then((updated_user) => {
            resolve(updated_user);
          })
          .catch((err) => {
            reject(err);
          });
        break;
    }
  });
}

module.exports = { trustAction };
