const chai = require("chai");
const chai_http = require("chai-http");
const should = chai.should();
const { faker } = require("@faker-js/faker");
const sequelize = require("../db/db_connection.js").sequelize;
const config = require("../config.js");
const register = require("../auth/register.js");
const db = require("../db/db.js");
const otp = require("otplib");
const auth_token = require("../auth/tokens.js");
const jwt = require("jsonwebtoken");
const email = require("../email/email.js");

const server = require("../server.js");
const valid_hcaptcha_response = "10000000-aaaa-bbbb-cccc-000000000001";

chai.use(chai_http);

describe("POST /auth/request_password_reset", () => {
  before(async () => {
    return new Promise(async (resolve, reject) => {
      // Prepare database (make sure all models are synced and the database is empty)
      await sequelize.sync({ force: true }).catch((error) => {
        return reject(
          new Error("Failed to sync models to database.", {
            cause: error,
          })
        );
      });
      // Create a user to test with
      await register
        .register_user(
          email.get_email_info(faker.internet.email()).realemail,
          "tester",
          faker.internet.password(8, false, undefined, "aA1"),
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
      return resolve();
    });
  });

  afterEach(async () => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.password_reset_token.sync({ force: true }); // Reset table after each test, deleting all password reset tokens.
        return resolve();
      } catch (error) {
        return reject(
          new Error("Failed to reset password reset token table.", {
            cause: error,
          })
        );
      }
    });
  });

  // Test a requesting a password reset token for a valid user.
  describe("Valid user.", async () => {
    it("it should respond with a success message and create a password reset token in the database.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/request_password_reset")
          .send({
            email: this.user.email,
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Password reset email sent.");
              // Make sure the password reset token was created in the database.
              password_reset_token = await db.password_reset_token
                .findOne({
                  where: { userUserid: this.user.userid },
                })
                .catch((error) => {
                  throw new Error("Failed to find password reset token.", {
                    cause: error,
                  });
                });
              should.exist(password_reset_token);
              password_reset_token.expired.should.equal(false);
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test a requesting a password reset token for an invalid user.
  describe("Non-existant user.", () => {
    it("it should respond with a success message but not create a password reset token in the database.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/request_password_reset")
          .send({
            email: "nonexistantuser@example.com",
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Password reset email sent.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test a requesting a password reset token for an valid user with an incorrect captcha response.
  describe("Valid user, INCORRECT CAPTCHA response.", () => {
    it("it should not send a password reset email, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/request_password_reset")
          .send({
            email: this.user.email,
            "h-captcha-response": "a",
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(409);
              res.body.error.should.equal(true);
              res.body.message.should.equal("CAPTCHA Incorrect.");
              // Make sure the password reset token was NOT created in the database.
              password_reset_token = await db.password_reset_token
                .findOne({
                  where: { userUserid: this.user.userid },
                })
                .catch((error) => {
                  throw new Error("Failed to find password reset token.", {
                    cause: error,
                  });
                });
              should.not.exist(password_reset_token);
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
});
