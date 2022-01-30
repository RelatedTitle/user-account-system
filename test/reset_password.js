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
const password_reset = require("../auth/password_reset.js");
const bcrypt = require("bcrypt");
const email = require("../email/email.js");

const server = require("../server.js");
const valid_hcaptcha_response = "10000000-aaaa-bbbb-cccc-000000000001";

chai.use(chai_http);

describe("POST /auth/reset_password", () => {
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
          ); // This is the new password that will be set after the reset.
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 1.", { cause: error })
          );
        });
      // Create a valid password reset token for user 1
      try {
        await password_reset
          .generate_password_reset_token(this.user.email)
          .then((token) => {
            this.user.valid_password_reset_token = token.token;
          });
      } catch (error) {
        return reject(
          new Error("Failed to create valid password reset token.", {
            cause: error,
          })
        );
      }
      user2_password = faker.internet.password(8, false, undefined, "aA1");
      // Create another user to test with
      await register
        .register_user(
          email.get_email_info(faker.internet.email()).realemail,
          "tester2",
          user2_password,
          null,
          "::ffff:127.0.0.1",
          null
        )
        .then((user) => {
          this.user2 = user;
          this.user2.password = user2_password;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 2.", { cause: error })
          );
        });
      // Create a valid password reset token for user 2, to then expire.
      try {
        await password_reset
          .generate_password_reset_token(this.user2.email)
          .then((token) => {
            this.user2.expired_password_reset_token = token.token;
          });
      } catch (error) {
        return reject(
          new Error("Failed to create expired password reset token.", {
            cause: error,
          })
        );
      }
      // Expire the password reset token for user 2
      try {
        await db.password_reset_token.update(
          { expired: true },
          {
            where: { token: this.user2.expired_password_reset_token },
          }
        );
      } catch (error) {
        return reject(
          new Error("Failed to expire password reset token.", {
            cause: error,
          })
        );
      }
      return resolve();
    });
  });

  // Test resetting a password with a valid token and a valid password
  describe("Valid token and password.", async () => {
    it("it should respond with a success message, send a confirmation email, change the user's password, expire the password reset token, and expire all refresh tokens.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/reset_password")
          .send({
            password_reset_token: this.user.valid_password_reset_token,
            password: this.user.new_password,
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

              // Make sure the password reset token was expired
              password_reset_token = await db.password_reset_token
                .findOne({
                  where: { token: this.user.valid_password_reset_token },
                })
                .catch((error) => {
                  throw new Error("Failed to find password reset token.", {
                    cause: error,
                  });
                });
              password_reset_token.expired.should.equal(true);
              // Make sure all of the user's refresh tokens were expired
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
                // Make sure all of the user's refresh tokens were expired
                refresh_token.expired.should.equal(true);
              });
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test resetting a password with a valid token but an invalid password
  describe("Valid token, invalid password.", async () => {
    it("it should not change the user's password, expire the password reset token or the refresh tokens, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/reset_password")
          .send({
            password_reset_token: this.user.valid_password_reset_token,
            password: "a",
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(400);
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

              // Make sure the password reset token was NOT expired
              password_reset_token = await db.password_reset_token
                .findOne({
                  where: { token: this.user.valid_password_reset_token },
                })
                .catch((error) => {
                  throw new Error("Failed to find password reset token.", {
                    cause: error,
                  });
                });
              password_reset_token.expired.should.equal(false);
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
  // Test resetting a password with a valid token but the same password
  describe("Valid token, same password.", async () => {
    it("it should not change the user's password, expire the password reset token or the refresh tokens, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/reset_password")
          .send({
            password_reset_token: this.user.valid_password_reset_token,
            password: this.user.password,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(401);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Password cannot be the same.");

              // Make sure the password reset token was NOT expired
              password_reset_token = await db.password_reset_token
                .findOne({
                  where: { token: this.user.valid_password_reset_token },
                })
                .catch((error) => {
                  throw new Error("Failed to find password reset token.", {
                    cause: error,
                  });
                });
              password_reset_token.expired.should.equal(false);
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
  // Test resetting a password with an expired token but a valid password
  describe("Expired token, valid password.", async () => {
    it("it should not change the user's password or expire the refresh tokens, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/reset_password")
          .send({
            password_reset_token: this.user2.expired_password_reset_token,
            password: faker.internet.password(8, false, undefined, "aA1"),
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(401);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Password reset token is expired.");
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
  // Test resetting a password with an invalid token but a valid password
  describe("Invalid token, valid password.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/reset_password")
          .send({
            password_reset_token: "a",
            password: faker.internet.password(8, false, undefined, "aA1"),
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(401);
              res.body.error.should.equal(true);
              res.body.message.should.equal(
                "Error verifying password reset token."
              );
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
});
