const chai = require("chai");
const chai_http = require("chai-http");
const should = chai.should();
const { faker } = require("@faker-js/faker");
const sequelize = require("../db/db_connection.js").sequelize;
const db = require("../db/db.js");
const bcrypt = require("bcrypt");
const config = require("../config.js");
const register = require("../auth/register.js");
const jwt = require("jsonwebtoken");
const email = require("../email/email.js");

const server = require("../server.js");

const valid_hcaptcha_response = "10000000-aaaa-bbbb-cccc-000000000001";

chai.use(chai_http);

function valid_username() {
  username = faker.internet.userName();
  if (!config.user.username_regex.test(username)) {
    return valid_username();
  }
  return username;
}

describe("POST /auth/register", () => {
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
          "tester@example.com",
          "tester",
          "hunter2",
          null,
          "::ffff:127.0.0.1",
          null
        )
        .then(() => {})
        .catch((error) => {
          return reject(
            new Error("Failed to create test user.", { cause: error })
          );
        });
      return resolve();
    });
  });

  // Test a valid registration
  describe("Valid user.", () => {
    it("it should successfully register the user.", () => {
      return new Promise(async (resolve, reject) => {
        let user = {
          username: valid_username(),
          email: email.get_email_info(faker.internet.email()).real_email,
          password: faker.internet.password(8, false, undefined, "aA1"),
          "h-captcha-response": valid_hcaptcha_response,
        };
        chai
          .request(server)
          .post("/auth/register")
          .send(user)
          .end((err, res) => {
            try {
              res.should.have.status(201);
              res.body.error.should.equal(false);
              res.body.message.should.equal("User registered successfully.");
              res.body.user.should.have.property("userid");
              res.body.user.username.should.equal(user.username.toLowerCase());
              res.body.user.email.should.equal(user.email.toLowerCase());
              // Check that the refresh token is valid.
              try {
                verified_refresh_token = jwt.verify(
                  res.body.refresh_token,
                  config.user.jwt_auth_secret
                );
              } catch (error) {
                throw new Error("Failed to verify refresh token.", {
                  cause: error,
                });
              }
              verified_refresh_token.user._id.should.equal(
                res.body.user.userid
              ); // Check that the refresh token has the correct userid
              verified_refresh_token.user.email.should.equal(
                user.email.toLowerCase()
              ); // Check that the refresh token has the correct email
              verified_refresh_token.type.should.equal("refresh"); // Check that the refresh token is a refresh token.
              // Check that the access token is valid.
              try {
                verified_access_token = jwt.verify(
                  res.body.access_token,
                  config.user.jwt_auth_secret
                );
              } catch (error) {
                throw new Error("Failed to verify access token.", {
                  cause: error,
                });
              }
              verified_access_token.user._id.should.equal(res.body.user.userid); // Check that the access token has the correct userid
              verified_access_token.user.email.should.equal(
                user.email.toLowerCase()
              ); // Check that the access token has the correct email
              verified_access_token.type.should.equal("access"); // Check that the access token is an access token.
              verified_access_token.refresh_token.should.equal(
                res.body.refresh_token
              ); // Check that the access token has the correct refresh token.
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test invalid username registration
  describe("Invalid username.", () => {
    it("it should not register a user, it should respond with a relevant error.", () => {
      return new Promise(async (resolve, reject) => {
        let user = {
          username: "@",
          email: email.get_email_info(faker.internet.email()).real_email,
          password: faker.internet.password(8, false, undefined, "aA1"),
          "h-captcha-response": valid_hcaptcha_response,
        };
        chai
          .request(server)
          .post("/auth/register")
          .send(user)
          .end((err, res) => {
            try {
              res.should.have.status(400);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Invalid username.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test invalid email address registration
  describe("Invalid email address.", () => {
    it("it should not register a user, it should respond with a relevant error.", () => {
      return new Promise(async (resolve, reject) => {
        let user = {
          username: valid_username(),
          email: "a",
          password: faker.internet.password(8, false, undefined, "aA1"),
          "h-captcha-response": valid_hcaptcha_response,
        };
        chai
          .request(server)
          .post("/auth/register")
          .send(user)
          .end((err, res) => {
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
  // Test invalid password registration
  describe("Invalid password.", () => {
    it("it should not register a user, it should respond with a relevant error.", () => {
      return new Promise(async (resolve, reject) => {
        let user = {
          username: valid_username(),
          email: email.get_email_info(faker.internet.email()).real_email,
          password: "a",
          "h-captcha-response": valid_hcaptcha_response,
        };
        chai
          .request(server)
          .post("/auth/register")
          .send(user)
          .end((err, res) => {
            try {
              res.should.have.status(400);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Invalid password.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test invalid CAPTCHA response registration
  describe("Invalid CAPTCHA.", () => {
    it("it should not register a user, it should respond with a relevant error.", () => {
      return new Promise(async (resolve, reject) => {
        let user = {
          username: valid_username(),
          email: email.get_email_info(faker.internet.email()).real_email,
          password: faker.internet.password(8, false, undefined, "aA1"),
          "h-captcha-response": "a",
        };
        chai
          .request(server)
          .post("/auth/register")
          .send(user)
          .end((err, res) => {
            try {
              res.should.have.status(409);
              res.body.error.should.equal(true);
              res.body.message.should.equal("CAPTCHA Incorrect.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test existing username registration
  describe("Existing username.", () => {
    it("it should not register a user, it should respond with a relevant error.", () => {
      return new Promise(async (resolve, reject) => {
        let user = {
          username: "tester",
          email: email.get_email_info(faker.internet.email()).real_email,
          password: faker.internet.password(8, false, undefined, "aA1"),
          "h-captcha-response": valid_hcaptcha_response,
        };
        chai
          .request(server)
          .post("/auth/register")
          .send(user)
          .end((err, res) => {
            try {
              res.should.have.status(409);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Username already in use.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test existing email address registration
  describe("Existing email address.", () => {
    it("it should not register a user, it should respond with a relevant error.", () => {
      return new Promise(async (resolve, reject) => {
        let user = {
          username: valid_username(),
          email: "tester@example.com",
          password: faker.internet.password(8, false, undefined, "aA1"),
          "h-captcha-response": valid_hcaptcha_response,
        };
        chai
          .request(server)
          .post("/auth/register")
          .send(user)
          .end((err, res) => {
            try {
              res.should.have.status(409);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Email address already in use.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
});
