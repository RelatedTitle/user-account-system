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

describe("POST /user/activate_2FA", () => {
  beforeEach(async () => {
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
      // Add 2FA secret to user (but don't activate it)
      secret = otp.authenticator.generateSecret(); // Generate a secret
      this.user.totp_secret = secret;
      await db.user
        .update({ MFA_secret: secret }, { where: { userid: this.user.userid } })
        .catch((error) => {
          return reject(
            new Error("Failed to add 2FA secret to user.", { cause: error })
          );
        });
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
      // Create another user to test with
      await register
        .register_user(
          email.get_email_info(faker.internet.email()).realemail,
          "tester3",
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
          this.user3 = user;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 3.", { cause: error })
          );
        });
      // Issue access and refresh tokens for user 3
      await auth_token
        .issue_refresh_jwt(this.user3.userid, this.user3.email)
        .then((tokens) => {
          this.user3.access_token = tokens.access_token;
          this.user3.refresh_token = tokens.refresh_token;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to issue user 3's refresh token.", {
              cause: error,
            })
          );
        });
      return resolve();
    });
  });

  // Test activating 2FA with a correct code, valid access token on a user that doesn't have 2FA activated previously.
  describe("2FA not activated. Correct code. Valid access token.", async () => {
    it("it should activate 2FA for the user and respond with a success message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/activate_2FA")
          .set("secret_token", this.user.access_token)
          .send({
            totp_code: otp.authenticator.generate(this.user.totp_secret),
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("2FA activated successfully.");
              // Make sure the 2FA is activated
              // Find user.
              user = await db.user
                .findOne({ where: { userid: this.user.userid } })
                .catch((error) => {
                  throw new Error("Failed to find user.", { cause: error });
                });
              user.MFA_secret.should.equal(this.user.totp_secret); // The 2FA secret should still be the same.
              user.MFA_active.should.equal(true); // 2FA should be activated.
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test activating 2FA with an incorrect code, valid access token on a user that doesn't have 2FA activated previously.
  describe("2FA not activated. INCORRECT code. Valid access token.", async () => {
    it("it should not activate 2FA for the user, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/activate_2FA")
          .set("secret_token", this.user.access_token)
          .send({
            totp_code: "123456",
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Incorrect TOTP code.");
              // Make sure the 2FA secret is not activated
              // Find user.
              user = await db.user
                .findOne({ where: { userid: this.user.userid } })
                .catch((error) => {
                  throw new Error("Failed to find user.", { cause: error });
                });
              user.MFA_secret.should.equal(this.user.totp_secret); // The 2FA secret should still be the same.
              user.MFA_active.should.equal(false); // 2FA should not be activated.
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test activating 2FA for a user that has already activated 2FA with a correct code and a valid access token.
  describe("2FA already activated. Correct code. Valid access token.", async () => {
    it("it should not change the user's 2FA secret nor disable 2FA. it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/activate_2FA")
          .set("secret_token", this.user2.access_token)
          .send({
            totp_code: otp.authenticator.generate(this.user2.totp_secret),
          })
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
  // Test activating 2FA for a user that never requested a 2FA secret with a valid access token.
  describe("2FA secret never requested. Valid access token.", async () => {
    it("it should not activate 2FA for the user, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/activate_2FA")
          .set("secret_token", this.user3.access_token)
          .send({
            totp_code: "123456",
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("2FA secret not requested.");
              // Make sure the 2FA secret is not activated
              // Find user.
              user = await db.user
                .findOne({ where: { userid: this.user3.userid } })
                .catch((error) => {
                  throw new Error("Failed to find user.", { cause: error });
                });
              user.MFA_active.should.equal(false); // 2FA should not be activated.
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test activating 2FA with an invalid access token
  describe("INVALID access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/activate_2FA")
          .set("secret_token", "a")
          .send({
            totp_code: "123456",
          })
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
