const chai = require("chai");
const chai_http = require("chai-http");
const should = chai.should();
const { faker } = require("@faker-js/faker");
const sequelize = require("../db/db_connection.js").sequelize;
const config = require("../config.js");
const register = require("../auth/register.js");
const db = require("../db/db.js");
const new_IP = require("../auth/new_IP.js");
const email = require("../email/email.js");

const server = require("../server.js");
const valid_hcaptcha_response = "10000000-aaaa-bbbb-cccc-000000000001";

chai.use(chai_http);

describe("POST /auth/authorize_new_IP", () => {
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
          email.get_email_info(faker.internet.email()).real_email,
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
      // Generate a new IP token for user 1
      try {
        new_IP_token = await new_IP.generate_new_IP_token(
          this.user.userid,
          this.user.email,
          "198.51.100.1"
        );
        this.user.new_IP_token = new_IP_token.token;
      } catch (error) {
        return reject(
          new Error("Failed to generate new IP token 1 for user 1.", {
            cause: error,
          })
        );
      }
      // Generate another new IP token for user 1, to then authorize.
      try {
        expired_new_IP_token = await new_IP.generate_new_IP_token(
          this.user.userid,
          this.user.email,
          "198.51.100.2"
        );
        this.user.expired_new_IP_token = expired_new_IP_token.token;
      } catch (error) {
        return reject(
          new Error("Failed to generate new IP token 2 for user 1.", {
            cause: error,
          })
        );
      }
      try {
        new_IP.check_new_IP_token(
          this.user.userid,
          "198.51.100.2",
          this.user.expired_new_IP_token
        );
      } catch (error) {}
      return resolve();
    });
  });

  // Test authorizing a new IP address with a valid token
  describe("Valid new IP token token.", async () => {
    it("it should respond with a success message, authorize the IP, and expire the new IP token.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/authorize_new_IP")
          .send({
            new_IP_token: this.user.new_IP_token,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal(
                "New IP address authorized successfully."
              );
              // Make sure the IP was verified successfully
              try {
                // Get the user IP from the database
                IP = await db.userip.findOne({
                  where: { ip: "198.51.100.1" },
                });
              } catch (error) {
                throw new Error("Failed to find user IP.", { cause: error });
              }
              IP.authorized.should.equal(true); // Make sure the IP was authorized
              // Make sure the new IP token was expired
              new_IP_token = await db.new_IP_token
                .findOne({
                  where: { token: this.user.new_IP_token },
                })
                .catch((error) => {
                  throw new Error("Failed to find new IP token.", {
                    cause: error,
                  });
                });
              new_IP_token.expired.should.equal(true);
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test authorizing an IP with an expired token
  describe("Valid new IP token token, already authorized IP", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/authorize_new_IP")
          .send({
            new_IP_token: this.user.expired_new_IP_token,
          })
          .end(async (err, res) => {
            try {
              res.should.have.status(401);
              res.body.error.should.equal(true);
              res.body.message.should.equal("New IP token is expired.");
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test authorizing an IP with an invalid token
  describe("Invalid new IP token token", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        chai
          .request(server)
          .post("/auth/authorize_new_IP")
          .send({
            new_IP_token: "a",
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
