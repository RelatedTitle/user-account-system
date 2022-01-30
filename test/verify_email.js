const chai = require("chai");
const chai_http = require("chai-http");
const should = chai.should();
const { faker } = require("@faker-js/faker");
const sequelize = require("../db/db_connection.js").sequelize;
const config = require("../config.js");
const register = require("../auth/register.js");
const db = require("../db/db.js");
const email_verification = require("../auth/email_verification.js");
const email = require("../email/email.js");

const server = require("../server.js");
const valid_hcaptcha_response = "10000000-aaaa-bbbb-cccc-000000000001";

chai.use(chai_http);

describe("POST /auth/verify_email", () => {
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
      // Find user 1's email verification token
      try {
        token = await db.email_verification_token.findOne({
          where: { userUserid: this.user.userid },
        });
        this.user.email_verification_token = token.token;
      } catch (error) {
        return reject(
          new Error("Failed to find user 1's email verification token.", {
            cause: error,
          })
        );
      }
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
      // Find user 2's email verification token
      try {
        token = await db.email_verification_token.findOne({
          where: { userUserid: this.user2.userid },
        });
        this.user2.email_verification_token = token.token;
      } catch (error) {
        return reject(
          new Error("Failed to find user 2's email verification token.", {
            cause: error,
          })
        );
      }
      // Verify user 2's email
      await email_verification
        .check_email_verification_token(
          this.user2.userid,
          this.user2.email,
          this.user2.email_verification_token
        )
        .catch((error) => {
          return reject(
            new Error("Failed to verify user 2's email.", { cause: error })
          );
        });
      return resolve();
    });
  });

  // Test verifying a user's email with a valid token
  describe("Valid email verification token.", async () => {
    it("it should respond with a success message, verify the user's email, and expire the email verification token.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/verify_email")
          .send({
            email_verification_token: this.user.email_verification_token,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Email verified successfully.");
              // Make sure the user's email was verified successfully
              try {
                // Get the user from the database
                user = await db.user.findOne({
                  where: { userid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find user.", { cause: error });
              }
              user.email_verified.should.equal(true); // Make sure the email was verified

              // Make sure the email verification token was expired
              email_verification_token = await db.email_verification_token
                .findOne({
                  where: { token: this.user.email_verification_token },
                })
                .catch((error) => {
                  throw new Error("Failed to find email verification token.", {
                    cause: error,
                  });
                });
              email_verification_token.expired.should.equal(true);
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test verifying a user's email with an expired (already verified) token
  describe("Expired email verification token.", async () => {
    it("it should not verify the user's email, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/verify_email")
          .send({
            email_verification_token: this.user2.email_verification_token,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(401);
              res.body.error.should.equal(true);
              res.body.message.should.equal(
                "Email verification token is expired."
              );
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test verifying a user's email with an invalid token
  describe("Invalid email verification token.", async () => {
    it("it should not verify the user's email, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/verify_email")
          .send({
            email_verification_token: "a",
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(401);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Tampered or invalid token.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
});
