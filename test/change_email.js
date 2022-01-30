const chai = require("chai");
const chai_http = require("chai-http");
const { faker } = require("@faker-js/faker");
const sequelize = require("../db/db_connection.js").sequelize;
const register = require("../auth/register.js");
const db = require("../db/db.js");
const email_verification = require("../auth/email_verification.js");
const email = require("../email/email.js");
const auth_token = require("../auth/tokens.js");
const should = chai.should();

const server = require("../server.js");

chai.use(chai_http);

describe("POST /user/change_email", () => {
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

  // Test changing user 1's email to a valid, unique email with a valid access token
  describe("Valid, unique email address. Valid access token.", async () => {
    it("it should respond with a success message, create an email verification token for the new email, and expire all of the other email verification tokens for the user.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_email")
          .set("secret_token", this.user.access_token)
          .send({
            email: this.user.new_email,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal(
                "Email verification sent successfully."
              );
              // Make sure the email verification token was created successfully
              new_email_verification_token = await db.email_verification_token
                .findOne({
                  where: {
                    userUserid: this.user.userid,
                    email: this.user.new_email,
                  },
                })
                .catch((error) => {
                  throw new Error("Failed to find email verification token.", {
                    cause: error,
                  });
                });
              new_email_verification_token.expired.should.equal(false); // Make sure the new email verification token is not expired
              // Make sure all other email verification tokens are expired
              email_verification_tokens = await db.email_verification_token
                .findAll({
                  where: {
                    userUserid: this.user.userid,
                  },
                })
                .catch((error) => {
                  throw new Error("Failed to find email verification tokens.", {
                    cause: error,
                  });
                });
              email_verification_tokens.forEach((email_verification_token) => {
                if (email_verification_token.email != this.user.new_email) {
                  email_verification_token.expired.should.equal(true); // Make sure all other email verification tokens are expired
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
  // Test changing user 1's email to the same email with a valid access token
  describe("Same email address. Valid access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_email")
          .set("secret_token", this.user.access_token)
          .send({
            email: this.user.email,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(400);
              res.body.error.should.equal(true);
              res.body.message.should.equal(
                "Email address cannot be the same."
              );
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing user 1's email to an existing email with a valid access token.
  describe("Existing email address. Valid access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_email")
          .set("secret_token", this.user.access_token)
          .send({
            email: this.user2.email,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(400);
              res.body.error.should.equal(true);
              res.body.message.should.equal(
                "Email address already in use by another account."
              );
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing user 1's email to an invalid email with a valid access token.
  describe("Invalid email address. Valid access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_email")
          .set("secret_token", this.user.access_token)
          .send({
            email: "a",
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(400);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Invalid email address.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing an email with an invalid access token
  describe("Valid email address. INVALID access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/user/change_email")
          .set("secret_token", "a")
          .send({
            email: this.user.new_email,
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
