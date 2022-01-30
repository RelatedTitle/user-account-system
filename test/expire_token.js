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

describe("POST /user/expire_token", () => {
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
      // Issue refresh and access tokens for the user (to test if they are expired)
      test_tokens = await auth_token
        .issue_refresh_jwt(this.user.userid, this.user.email)
        .catch((error) => {
          return reject(
            new Error("Failed to issue 1st refresh token.", { cause: error })
          );
        });
      this.user.test_refresh_token = test_tokens.refresh_token;
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

  // Test expiring all tokens with a valid access token
  describe("Expire all tokens. Valid access token", async () => {
    it("it should respond with a success message, and expire all refresh tokens.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/expire_token")
          .set("secret_token", this.user.access_token)
          .send({
            expire_all: true,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Tokens expired successfully.");
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
                // Make sure each refresh token is expired
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
  // Test expiring all tokens except the current one with a valid access token
  describe("Expire all tokens (excluding the current one). Valid access token", async () => {
    it("it should respond with a success message, and expire all refresh tokens except the current one.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/expire_token")
          .set("secret_token", this.user.access_token)
          .send({
            expire_all: true,
            exclude_current: true,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Tokens expired successfully.");
              // Make sure all of the user's refresh tokens were expired (except the current one)
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
  // Test expiring a specific token with a valid access token
  describe("Expire specific token. Valid access token", async () => {
    it("it should respond with a success message, and expire that specific token.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/expire_token")
          .set("secret_token", this.user.access_token)
          .send({
            tokens: [this.user.test_refresh_token],
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Tokens expired successfully.");
              // Make sure only the specific refresh token was expired
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
                if (refresh_token.token === this.user.test_refresh_token) {
                  refresh_token.expired.should.equal(true); // If the token is the one we want to expire, it should be expired
                } else {
                  refresh_token.expired.should.equal(false); // If the token is not the one we want to expire, it should not be expired
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
  // Test expiring all tokens with an invalid access token
  describe("Expire all tokens. Invalid access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/expire_token")
          .set("secret_token", "a")
          .send({
            expire_all: true,
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
