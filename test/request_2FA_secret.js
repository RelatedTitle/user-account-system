const chai = require("chai");
const chai_http = require("chai-http");
const { faker } = require("@faker-js/faker");
const sequelize = require("../db/db_connection.js").sequelize;
const register = require("../auth/register.js");
const db = require("../db/db.js");
const email = require("../email/email.js");
const auth_token = require("../auth/tokens.js");
const otp = require("otplib");
const should = chai.should();

const server = require("../server.js");

chai.use(chai_http);

describe("POST /user/request_2FA_secret", () => {
  before(async () => {
    return new Promise(async (resolve, reject) => {
      // Reset database
      try {
        await sequelize.sync({ force: true });
      } catch (error) {
        return reject(
          new Error("Failed to sync models to database.", { cause: error })
        );
      }
      // Create a user to test with
      await register
        .register_user(
          email.get_email_info(faker.internet.email()).realemail,
          "tester",
          (user1_password = faker.internet.password(
            8,
            false,
            undefined,
            "aA1"
          )),
          null,
          "::ffff:127.0.0.1",
          null
        )
        .then((user) => {
          this.user = user;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 1.", { cause: error })
          );
        });
      this.user.new_email = email.get_email_info(
        faker.internet.email()
      ).realemail;
      // Issue access and refresh tokens for user 1
      await auth_token
        .issue_refresh_jwt(this.user.userid, this.user.email)
        .then((tokens) => {
          this.user.access_token = tokens.access_token;
          this.user.refresh_token = tokens.refresh_token;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to issue user 1's refresh token.", {
              cause: error,
            })
          );
        });
      // Create another user to test with
      await register
        .register_user(
          email.get_email_info(faker.internet.email()).realemail,
          "tester2",
          (user1_password = faker.internet.password(
            8,
            false,
            undefined,
            "aA1"
          )),
          null,
          "::ffff:127.0.0.1",
          null
        )
        .then((user) => {
          this.user2 = user;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 2.", { cause: error })
          );
        });
      // Activate 2FA for user 2.
      secret = otp.authenticator.generateSecret(); // Generate a secret
      this.user2.totp_secret = secret;
      // Save the secret to the database and activate 2FA
      await db.user
        .update(
          {
            MFA_active: true,
            MFA_secret: secret,
          },
          { where: { userid: this.user2.userid } }
        )
        .catch((error) => {
          return reject(
            new Error("Failed to activate 2FA for user 2.", { cause: error })
          );
        });
      // Issue access and refresh tokens for user 2
      await auth_token
        .issue_refresh_jwt(this.user2.userid, this.user2.email)
        .then((tokens) => {
          this.user2.access_token = tokens.access_token;
          this.user2.refresh_token = tokens.refresh_token;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to issue user 2's refresh token.", {
              cause: error,
            })
          );
        });
      return resolve();
    });
  });

  // Test requesting a 2FA secret for a user that has not activated 2FA with a valid access token.
  describe("2FA not activated. Valid access token.", async () => {
    it("it should add the 2FA secret to the user, but not activate 2FA. it should respond with the 2FA secret.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/request_2FA_secret")
          .set("secret_token", this.user.access_token)
          .send({})
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.should.have.property("totp_secret");
              totp_secret = res.body.totp_secret;
              // Make sure the 2FA secret is stored in the database, but 2FA is not activated.
              // Find user.
              user = await db.user
                .findOne({ where: { userid: this.user.userid } })
                .catch((error) => {
                  throw new Error("Failed to find user.", { cause: error });
                });
              user.MFA_secret.should.equal(totp_secret); // The 2FA secret should be the same as the one returned from the server.
              user.MFA_active.should.equal(false); // 2FA should not be activated.
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test requesting a 2FA secret for a user that has already activated 2FA with a valid access token.
  describe("2FA already activated. Valid access token.", async () => {
    it("it should not change the user's 2FA secret nor disable 2FA. it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/request_2FA_secret")
          .set("secret_token", this.user2.access_token)
          .send({})
          .end(async (err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("2FA is already enabled.");
              totp_secret = res.body.totp_secret;
              // Make sure the 2FA secret is not changed.
              // Find user.
              user = await db.user
                .findOne({ where: { userid: this.user2.userid } })
                .catch((error) => {
                  throw new Error("Failed to find user.", { cause: error });
                });
              user.MFA_secret.should.equal(this.user2.totp_secret); // The 2FA secret should be the same as it was before.
              user.MFA_active.should.equal(true); // 2FA should still be activated.
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test requesting a 2FA secret with an invalid access token
  describe("INVALID access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/request_2FA_secret")
          .set("secret_token", "a")
          .send({})
          .end(async (err, res) => {
            try {
              res.should.have.status(401);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Unauthorized");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
});
