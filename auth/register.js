const config = require("../config.js");
const db = require("../db/db.js");
const email = require("../email/email.js");
const bcrypt = require("bcrypt");
const avatar = require("../util/avatar.js");

const email_verification = require("./email_verification.js");

const { customAlphabet } = require("nanoid");
const generateuserid = customAlphabet(
  config.user.id_alphabet,
  config.user.id_length
);

// Upload and store the user's avatar in the database if needed.
function handle_avatar(registered_user, user_avatar, avatar_url, store_avatar) {
  return new Promise(async (resolve, reject) => {
    if (user_avatar == null) {
      return resolve(registered_user);
    }
    if (store_avatar) {
      // Store avatar if needed
      await avatar
        .upload_avatar(user_avatar)
        .then((stored_avatar_url) => {
          avatar_url = stored_avatar_url;
        })
        .catch(() => {
          return resolve(registered_user);
        });
    }
    // Store avatar url in user
    db.user
      .update(
        { avatar_url: avatar_url },
        { where: { userid: registered_user.userid } }
      )
      .then(() => {
        registered_user.avatar_url = avatar_url;
        return resolve(registered_user);
      })
      .catch(() => {
        // Failed to update user with avatar url
        return resolve(registered_user);
      });
  });
}

async function register_user(
  user_email,
  user_username,
  user_password,
  oauth_data,
  IP,
  avatar_url
) {
  let email_info = email.get_email_info(user_email);
  let userid = generateuserid();
  let currentDate = new Date();

  if (!user_username) {
    // If no username is provided, use userid as username
    user_username = userid.toString();
  }

  return new Promise(async function (resolve, reject) {
    let user_avatar = null;
    let store_avatar = false;
    if (avatar_url) {
      // Try to download the avatar from the given url
      await avatar.download_avatar(avatar_url).then((downloaded_avatar) => {
        user_avatar = downloaded_avatar;
        store_avatar = true;
      });
    } else {
      // If no avatar url is provided, try to fetch the user's avatar from gravatar.
      await avatar
        .download_avatar(avatar.gravatar_image(user_email))
        .then((downloaded_avatar) => {
          // User does have a gravatar image.
          user_avatar = downloaded_avatar;
          if (config.user.avatar.store_gravatar) {
            store_avatar = true;
          }
          avatar_url = gravatar_avatar_url;
        })
        .catch((err) => {
          // User does not have a gravatar image linked to their email or the image couldn't be stored/processed
          avatar_url = undefined;
        });
    }
    // Gets email info:
    // Generates salt with defined salt rounds in config:
    bcrypt.genSalt(config.user.bcrypt_salt_rounds, function (err, salt) {
      // Hashes password:
      bcrypt.hash(user_password, salt, function (err, hashed_password) {
        //Stores user in DB:
        let new_user = db.user.build({
          userid: userid,
          username: user_username?.toLowerCase(),
          email: email_info.realemail,
          email_verified: false,
          password: hashed_password,
          creation_date: currentDate,
          oauth: {},
        });
        if (oauth_data) {
          // If registering through an OAuth provider.
          // If the provider is GitHub, we know for a fact that the email is verified since it is required to use OAuth. (https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/authorizing-oauth-apps)
          // If the provider is Google, we know whether the email is verified or not by profile.email_verified.
          // If the provider is Discord, we know whether the email is verified by profile.verified.
          // If the provider is Facebook, we don't know whether the email is verified or not.
          if (
            oauth_data.data.email_verified ||
            (oauth_data.provider == "Discord" && oauth_data.data.verified) ||
            oauth_data.provider == "GitHub"
          ) {
            // User's email address is not verified and matches the one in the account they're linking (which is verified).
            new_user.email_verified = true; // Verify the email address.
          }
          var account_connection = db.account_connection.build({
            userUserid: userid,
            id: oauth_data.data.id,
            provider: oauth_data.provider,
            data: oauth_data.data,
          });
        }
        // Add registration IP as an authorized user IP:
        var userip = db.userip.build({
          userUserid: userid,
          ip: IP,
          date_added: new Date(),
          authorized: true,
          date_authorized: new Date(),
        });
        new_user
          .save()
          .then(async (registered_user) => {
            // Save userip
            userip.save();
            // Save account_connection (if needed)
            if (oauth_data) {
              account_connection.save();
            }
            // Created user successfully
            // If the user has an avatar, store it and put the avatar url in the database:
            registered_user = await handle_avatar(
              registered_user,
              user_avatar,
              avatar_url,
              store_avatar
            ); // Set the registered_user to the updated one (with the avatar_url) if needed.
            // Send email verification token (if not verified already):
            if (!registered_user.email_verified) {
              email_verification
                .generate_email_verification_token(
                  registered_user.userid,
                  registered_user.email
                )
                .then(() => {
                  // Email verification token sent.
                });
              return resolve(registered_user);
            }
            // User registered without sending an email verification token.
            return resolve(registered_user);
          })
          .catch((err) => {
            switch (Object.keys(err.fields)[0]) {
              case "email":
                return reject("Email already exists");
              case "username":
                if (oauth_data) {
                  // If registering through an OAuth provider, recursively call register_user without providing a username (so it uses the userid).
                  register_user(user_email, null, null, oauth_data, IP)
                    .then((registered_user) => {
                      return resolve(registered_user);
                    })
                    .catch((err) => {
                      return reject(err);
                    });
                  break;
                } else {
                  return reject("Username already exists");
                }
              default:
                return reject("Unknown Error");
            }
          });
      });
    });
  });
}

module.exports = { register_user };
