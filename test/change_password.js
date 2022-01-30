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
const bcrypt = require("bcrypt");
const email = require("../email/email.js");

const server = require("../server.js");
const valid_hcaptcha_response = "10000000-aaaa-bbbb-cccc-000000000001";

chai.use(chai_http);

describe("POST /user/change_password", () => {
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
      user1_password = faker.internet.password(8, false, undefined, "aA1");
      await register
        .register_user(
          email.get_email_info(faker.internet.email()).realemail,
          "tester",
          user1_password,
          null,
          "::ffff:127.0.0.1",
          null
        )
        .then((user) => {
          this.user = user;
          this.user.password = user1_password;
          this.user.new_password = faker.internet.password(
            8,
            false,
            undefined,
            "aA1"
          ); // This is the new password that will be set after the password change.
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 1.", { cause: error })
          );
        });
      // Issue refresh and access tokens for the user (to test if they are expired)
      await auth_token
        .issue_refresh_jwt(this.user.userid, this.user.email)
        .catch((error) => {
          return reject(
            new Error("Failed to issue 1st refresh token.", { cause: error })
          );
        });
      // Issue a 2nd pair of tokens to actually use for auth. (Waiting 2 seconds to make sure the iat is different, and therefore the tokens are different)
      setTimeout(() => {
        auth_token
          .issue_refresh_jwt(this.user.userid, this.user.email)
          .then((tokens) => {
            this.user.access_token = tokens.access_token;
            this.user.refresh_token = tokens.refresh_token;
            return resolve();
          })
          .catch((error) => {
            return reject(
              new Error("Failed to issue 2nd refresh token.", { cause: error })
            );
          });
      }, 2000);
    });
  });

  // Test changing a password with a valid access token and a valid new password, and correct old password
  describe("Valid access token, valid new password, correct old password.", async () => {
    it("it should respond with a success message, send a confirmation email, change the user's password, and expire all refresh tokens except the one used for the request.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_password")
          .set("secret_token", this.user.access_token)
          .send({
            old_password: this.user.password,
            new_password: this.user.new_password,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Password changed successfully.");
              // Make sure the user's password was changed
              try {
                // Get the user from the database
                user = await db.user.findOne({
                  where: { userid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find user.", { cause: error });
              }
              // Compare the new password with the password from the database
              try {
                results = await bcrypt.compare(
                  this.user.new_password,
                  user.password
                );
              } catch (error) {
                throw new Error("Failed to compare passwords.", {
                  cause: error,
                });
              }
              results.should.equal(true); // Make sure the password was changed
              // Make sure all of the user's refresh tokens were expired (except the one used for the request)
              try {
                refresh_tokens = await db.refresh_token.findAll({
                  where: { userUserid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find refresh tokens.", {
                  cause: error,
                });
              }
              refresh_tokens.forEach((refresh_token) => {
                // If the refresh token is the one used for the request, make sure it is not expired, otherwise make sure it is expired
                if (refresh_token.token === this.user.refresh_token) {
                  refresh_token.expired.should.equal(false);
                } else {
                  refresh_token.expired.should.equal(true);
                }
              });
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing a password with a valid access token, invalid new password, and correct old password
  describe("Valid access token, INVALID new password, correct old password.", async () => {
    it("it should not change the user's password or expire the refresh tokens, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_password")
          .set("secret_token", this.user.access_token)
          .send({
            old_password: this.user.password,
            new_password: "a",
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Invalid password.");
              // Make sure the user's password was NOT changed
              try {
                // Get the user from the database
                user = await db.user.findOne({
                  where: { userid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find user.", { cause: error });
              }
              // Compare the new password with the password from the database
              try {
                results = await bcrypt.compare(
                  this.user.new_password,
                  user.password
                );
              } catch (error) {
                throw new Error("Failed to compare passwords.", {
                  cause: error,
                });
              }
              results.should.equal(false); // Make sure the password was NOT changed
              // Make sure all of the user's refresh tokens were NOT expired
              try {
                refresh_tokens = await db.refresh_token.findAll({
                  where: { userUserid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find refresh tokens.", {
                  cause: error,
                });
              }
              refresh_tokens.forEach((refresh_token) => {
                // Make sure all of the user's refresh tokens were NOT expired
                refresh_token.expired.should.equal(false);
              });
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing a password with a valid access token but the same password
  describe("Valid access token, same password.", async () => {
    it("it should not change the user's password or expire  the refresh tokens, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_password")
          .set("secret_token", this.user.access_token)
          .send({
            old_password: this.user.password,
            new_password: this.user.password,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Password cannot be the same.");
              // Make sure all of the user's refresh tokens were NOT expired
              try {
                refresh_tokens = await db.refresh_token.findAll({
                  where: { userUserid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find refresh tokens.", {
                  cause: error,
                });
              }
              refresh_tokens.forEach((refresh_token) => {
                // Make sure all of the user's refresh tokens were NOT expired
                refresh_token.expired.should.equal(false);
              });
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing a password with a valid access token, valid new password, and INCORRECT old password
  describe("Valid access token, VALID new password, INCORRECT old password.", async () => {
    it("it should not change the user's password or expire the refresh tokens, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_password")
          .set("secret_token", this.user.access_token)
          .send({
            old_password: "a",
            new_password: this.user.new_password,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Incorrect password.");
              // Make sure the user's password was NOT changed
              try {
                // Get the user from the database
                user = await db.user.findOne({
                  where: { userid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find user.", { cause: error });
              }
              // Compare the new password with the password from the database
              try {
                results = await bcrypt.compare(
                  this.user.new_password,
                  user.password
                );
              } catch (error) {
                throw new Error("Failed to compare passwords.", {
                  cause: error,
                });
              }
              results.should.equal(false); // Make sure the password was NOT changed
              // Make sure all of the user's refresh tokens were NOT expired
              try {
                refresh_tokens = await db.refresh_token.findAll({
                  where: { userUserid: this.user.userid },
                });
              } catch (error) {
                throw new Error("Failed to find refresh tokens.", {
                  cause: error,
                });
              }
              refresh_tokens.forEach((refresh_token) => {
                // Make sure all of the user's refresh tokens were NOT expired
                refresh_token.expired.should.equal(false);
              });
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing a password with an invalid access token
  describe("Invalid access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_password")
          .set("secret_token", "a")
          .send({
            new_password: faker.internet.password(8, false, undefined, "aA1"),
            old_password: faker.internet.password(8, false, undefined, "aA1"),
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
