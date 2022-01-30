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

chai.use(chai_http);

describe("POST /auth/refresh_token", () => {
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
      // Create another user to test with
      await register
        .register_user(
          email.get_email_info(faker.internet.email()).realemail,
          "tester2",
          faker.internet.password(8, false, undefined, "aA1"),
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
      try {
        // Issue a valid refresh token for the user
        valid_tokens = await auth_token.issue_refresh_jwt(
          this.user.userid,
          this.user.email
        );
      } catch (error) {
        return reject(
          new Error("Failed to issue valid refresh token.", {
            cause: error,
          })
        );
      }
      this.valid_refresh_token = valid_tokens.refresh_token;
      // Get a valid token, but of the wrong type (access token instead of refresh token)
      this.incorrect_type_token = valid_tokens.access_token;

      try {
        // Issue a refresh token for the user (to then expire).
        expired_tokens = await auth_token.issue_refresh_jwt(
          this.user2.userid,
          this.user2.email
        );
        this.expired_refresh_token = expired_tokens.refresh_token;
      } catch (error) {
        return reject(
          new Error("Failed to issue expired refresh token.", {
            cause: error,
          })
        );
      }
      try {
        // Expire the previously issued refresh token.
        await auth_token.expire_refresh_tokens(
          [this.expired_refresh_token],
          "Test."
        );
      } catch (error) {
        return reject(
          new Error("Failed to expire refresh token.", { cause: error })
        );
      }
      // Issue a refresh token with an incorrect secret.
      this.tampered_refresh_token = jwt.sign(
        {
          user: { _id: this.user.userid, email: this.user.email },
          type: "refresh",
        },
        "incorrect_secret"
      );
      return resolve();
    });
  });

  // Test a refreshing a valid token.
  describe("Valid refresh token.", () => {
    it("it should generate a new valid access token from the refresh token.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/refresh_token")
          .send({
            refresh_token: this.valid_refresh_token,
          })
          .end((err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.should.have.property("access_token");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test refreshing a token of the wrong type.
  describe("Incorrect type token.", () => {
    it("it should not generate a refresh token, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/refresh_token")
          .send({
            refresh_token: this.incorrect_type_token,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("No such valid refresh token.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test refreshing an expired token.
  describe("Expired refresh token.", () => {
    it("it should not generate a refresh token, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/refresh_token")
          .send({
            refresh_token: this.expired_refresh_token,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Refresh token is expired.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test refreshing a tampered token.
  describe("Tampered refresh token.", () => {
    it("it should not generate a refresh token, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/refresh_token")
          .send({
            refresh_token: this.tampered_refresh_token,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("No such valid refresh token.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
});
