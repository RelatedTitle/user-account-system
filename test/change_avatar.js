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
const fs = require("fs");

const server = require("../server.js");

chai.use(chai_http);

describe("POST /user/change_avatar", () => {
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
      return resolve();
    });
  });

  // Test changing user 1's avatar to a valid image with a valid access token
  describe("Valid image. Valid access token.", async () => {
    it("it should store the avatar in the configured provider (locally, S3, etc), store the avatar url in the database and respond with a success message.", () => {
      return new Promise(async (resolve, reject) => {
        avatar = fs.readFileSync("test/avatar_test.png");
        chai
          .request(server)
          .post("/user/change_avatar")
          .set("secret_token", this.user.access_token)
          .attach("avatar", avatar, "avatar_test.jpg")
          .end(async (err, res) => {
            try {
              res.should.have.status(200);
              res.body.error.should.equal(false);
              res.body.message.should.equal("Avatar uploaded successfully.");
              // Find user
              user = await db.user
                .findOne({ where: { userid: this.user.userid } })
                .catch((error) => {
                  throw new Error("Failed to find user.", { cause: error });
                });
              // Check that the avatar url is stored in the database
              user.avatar_url.should.not.equal(null); // Make sure the avatar url is not null
            } catch (error) {
              return reject(error);
            }
            return resolve();
          });
      });
    });
  });
  // Test changing the avatar with an invalid access token
  describe("Valid image. INVALID access token.", async () => {
    it("it should respond with a relevant error message.", () => {
      return new Promise(async (resolve, reject) => {
        avatar = fs.readFileSync("test/avatar_test.png");
        chai
          .request(server)
          .post("/user/change_avatar")
          .set("secret_token", "a")
          .attach("avatar", avatar, "avatar_test.jpg")
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
