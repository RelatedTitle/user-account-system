const chai = require("chai");
const chai_http = require("chai-http");
const should = chai.should();
const { faker } = require("@faker-js/faker");
const sequelize = require("../db/db_connection.js").sequelize;
const config = require("../config.js");
const register = require("../auth/register.js");
const db = require("../db/db.js");
const otp = require("otplib");
const jwt = require("jsonwebtoken");

const server = require("../server.js");

const valid_hcaptcha_response = "10000000-aaaa-bbbb-cccc-000000000001";

chai.use(chai_http);

describe("POST /auth/login", () => {
  before(async () => {
    return new Promise(async (resolve, reject) => {
      // Prepare database (make sure all models are synced and the database is empty)
      await sequelize.sync({ force: true }).catch((error) => {
        return reject(
          Error("Failed to sync models to database.", {
            cause: error,
          })
        );
      });
      // Create a user to test with
      this.credentials = [
        {
          email: "tester@example.com",
          password: faker.internet.password(8, false, undefined, "aA1"),
        },
        {
          email: "tester2@example.com",
          password: faker.internet.password(8, false, undefined, "aA1"),
        },
        {
          email: "tester3@example.com",
          password: faker.internet.password(8, false, undefined, "aA1"),
        },
        {
          email: "tester4@example.com",
          password: faker.internet.password(8, false, undefined, "aA1"),
        },
      ];
      // Create a user to test with, no 2FA, same IP address from the requests.
      await register
        .register_user(
          this.credentials[0].email,
          "tester",
          this.credentials[0].password,
          null,
          "::ffff:127.0.0.1",
          null
        )
        .then((user) => {
          this.credentials[0].user = user;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 1.", { cause: error })
          );
        });
      // Create a user to test with, no 2FA, different IP address from the requests.
      await register
        .register_user(
          this.credentials[1].email,
          "tester2",
          this.credentials[1].password,
          null,
          "0",
          null
        )
        .then((user) => {
          this.credentials[1].user = user;
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 2.", { cause: error })
          );
        });
      // Create a user to test with, no 2FA, different IP address from the requests (add the IP to userips but don't authorize it).
      await register
        .register_user(
          this.credentials[2].email,
          "tester3",
          this.credentials[2].password,
          null,
          "0",
          null
        )
        .then(async (user) => {
          this.credentials[2].user = user;
          try {
            await db.userip.create({
              userUserid: user.userid,
              ip: "::ffff:127.0.0.1",
              date_added: new Date(),
              authorized: false,
              date_authorized: new Date(),
            }); // Add the IP to userips but don't authorize it.
          } catch (error) {
            return reject(
              new Error("Failed to create new IP for test user 3.", {
                cause: error,
              })
            );
          }
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 3.", { cause: error })
          );
        });
      // Create a user to test with, 2FA enabled, same IP address from the requests.
      await register
        .register_user(
          this.credentials[3].email,
          "tester4",
          this.credentials[3].password,
          null,
          "::ffff:127.0.0.1",
          null
        )
        .then(async (user) => {
          this.credentials[3].user = user;
          secret = otp.authenticator.generateSecret(); // Generate a 2FA secret for the user.
          this.credentials[3].secret = secret;
          // Enable 2FA for the user with the secret.
          try {
            await db.user.update(
              {
                MFA_active: true,
                MFA_secret: secret,
              },
              { where: { userid: user.userid } }
            );
          } catch (error) {
            return reject(
              new Error("Failed to enable 2FA for test user 4.", {
                cause: error,
              })
            );
          }
        })
        .catch((error) => {
          return reject(
            new Error("Failed to create test user 4.", { cause: error })
          );
        });
      return resolve();
    });
  });

  // Test a valid login. No 2FA, authorized IP address.
  describe("Valid user, correct email and password, no 2FA, authorized IP address.", () => {
    it("it should successfully log the user in, it should issue valid access and refresh tokens.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[0].email,
            password: this.credentials[0].password,
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
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
                this.credentials[0].user.userid
              ); // Check that the refresh token has the correct userid
              verified_refresh_token.user.email.should.equal(
                this.credentials[0].email
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
              verified_access_token.user._id.should.equal(
                this.credentials[0].user.userid
              ); // Check that the access token has the correct userid
              verified_access_token.user.email.should.equal(
                this.credentials[0].email
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
  // Test a valid login. 2FA enabled and correct secret provided, authorized IP address.
  describe("Valid user, correct email and password, 2FA enabled and correct secret provided, authorized IP address.", () => {
    it("it should successfully log the user in.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[3].email,
            password: this.credentials[3].password,
            totp_code: otp.authenticator.generate(this.credentials[3].secret),
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
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
                this.credentials[3].user.userid
              ); // Check that the refresh token has the correct userid
              verified_refresh_token.user.email.should.equal(
                this.credentials[3].email
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
              verified_access_token.user._id.should.equal(
                this.credentials[3].user.userid
              ); // Check that the access token has the correct userid
              verified_access_token.user.email.should.equal(
                this.credentials[3].email
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
  // Test a valid login. 2FA enabled and INCORRECT secret provided, authorized IP address.
  describe("Valid user, correct email and password, 2FA enabled, INCORRECT secret provided, authorized IP address.", () => {
    it("it should not log the user in, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[3].email,
            password: this.credentials[3].password,
            totp_code: "a",
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Incorrect TOTP code.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test a valid login. 2FA enabled and NO secret provided, authorized IP address.
  describe("Valid user, correct email and password, 2FA enabled, NO secret provided, authorized IP address.", () => {
    it("it should not log the user in, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[3].email,
            password: this.credentials[3].password,
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal(
                "2FA is active but no code was provided."
              );
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test an invalid login.
  describe("Valid user, correct email, INCORRECT password, 2FA disabled, authorized IP address.", () => {
    it("it should not log the user in, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[0].email,
            password: "a",
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("Incorrect password.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test a invalid login.
  describe("Invalid user, INCORRECT email, INCORRECT password.", () => {
    it("it should not log the user in, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: "nonexistantuser@example.com",
            password: "a",
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("User not found.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test a valid login. No 2FA, unauthorized (but new) IP address.
  describe("Valid user, correct email and password, no 2FA, new unauthorized IP address.", () => {
    it("it should not log the user in, it should generate a new IP token and send an email.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[1].email,
            password: this.credentials[1].password,
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal(
                "New IP address, authorization required."
              );
              // Make sure the IP token was generated.
              new_IP_token = await db.new_IP_token
                .findOne({
                  where: {
                    userUserid: this.credentials[1].user.userid,
                    ip: "::ffff:127.0.0.1",
                  },
                })
                .catch((error) => {
                  throw new Error("Failed to find new IP token.", {
                    cause: error,
                  });
                });
              should.exist(new_IP_token);
              // Make sure the IP was added to the userips table and is unauthorized.
              IP = await db.userip
                .findOne({
                  where: {
                    userUserid: this.credentials[1].user.userid,
                    ip: "::ffff:127.0.0.1",
                  },
                })
                .catch((error) => {
                  throw new Error("Failed to find IP.", {
                    cause: error,
                  });
                });
              should.exist(IP);
              IP.authorized.should.equal(false);
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test a valid login. No 2FA, unauthorized (not new) IP address.
  describe("Valid user, correct email and password, no 2FA, unauthorized IP address.", () => {
    it("it should not log the user in, it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[2].email,
            password: this.credentials[2].password,
            "h-captcha-response": valid_hcaptcha_response,
          })
          .end((err, res) => {
            try {
              res.should.have.status(403);
              res.body.error.should.equal(true);
              res.body.message.should.equal("IP address not authorized.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test invalid CAPTCHA response login
  describe("Valid user, correct email and password, no 2FA, unauthorized IP address, INVALID CAPTCHA response.", () => {
    it("it should not log the user in, it should respond with a relevant error.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/login")
          .send({
            email: this.credentials[0].email,
            password: this.credentials[0].password,
            "h-captcha-response": "a",
          })
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
});
