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
async function handle_avatar(
  registered_user,
  user_avatar,
  avatar_url,
  store_avatar
) {
  if (store_avatar) {
    // Store avatar if needed
    await avatar
      .upload_avatar(user_avatar)
      .then((stored_avatar_url) => {
        avatar_url = stored_avatar_url;
      })
      .catch((error) => {
        // Failed to store avatar
        throw new Error("Failed to store avatar.", { cause: error });
      });
  }
  try {
    // Store avatar url in user
    await db.user.update(
      { avatar_url: avatar_url },
      { where: { userid: registered_user.userid } }
    );
  } catch (error) {
    // Failed to update user with avatar url
    throw new Error("Failed to update user.", { cause: error });
  }
  return avatar_url;
}

async function register_user(
  user_email,
  user_username,
  user_password,
  oauth_data,
  IP,
  avatar_url
) {
  let email_info = email.get_email_info(user_email); // Get email info
  let userid = generateuserid(); // Generate random userid
  let current_date = new Date();

  if (!user_username) {
    // If no username is provided, use userid as username
    user_username = userid.toString();
  }
  let user_avatar = null;
  let store_avatar = false;
  if (avatar_url) {
    // Try to download the avatar from the given url
    try {
      var downloaded_avatar = await avatar.download_avatar(avatar_url);
    } catch (error) {
      // Failed to download avatar
      avatar_url = null;
    }
    user_avatar = downloaded_avatar;
    store_avatar = true;
  } else {
    // If no avatar url is provided, try to fetch the user's avatar from gravatar.
    avatar_url = avatar.gravatar_image(user_email);
    try {
      var downloaded_avatar = await avatar.download_avatar(avatar_url);
    } catch (error) {
      // Failed to download avatar
      avatar_url = null;
    }
    user_avatar = downloaded_avatar;
    if (config.user.avatar.store_gravatar) {
      store_avatar = true;
    }
  }

  try {
    var salt = await bcrypt.genSalt(config.user.bcrypt_salt_rounds); // Generate salt with defined salt rounds in config.
  } catch (error) {
    throw new Error("Failed to generate salt.", { cause: error });
  }
  try {
    var hashed_password = await bcrypt.hash(user_password, salt); // Hash password.
  } catch (error) {
    throw new Error("Failed to hash password.", { cause: error });
  }
  // Create new user (but don't save it yet)
  let new_user = db.user.build({
    userid: userid,
    username: user_username?.toLowerCase(),
    email: email_info.real_email,
    email_verified: false,
    password: hashed_password,
    creation_date: current_date,
    oauth: {},
    MFA_active: false,
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
  try {
    var registered_user = await new_user.save(); // Save user in database.
  } catch (error) {
    // Error saving user to database
    switch (Object.keys(error.fields)[0]) {
      case "email":
        throw new Error("Email address already in use.");
      case "username":
        if (oauth_data) {
          // If registering through an OAuth provider, recursively call register_user without providing a username (so it uses the userid).
          try {
            registered_user = await register_user(
              user_email,
              null,
              null,
              oauth_data,
              IP
            );
          } catch (error) {
            throw new Error("Error re-registering user through OAuth.", {
              cause: error,
            });
          }
          return registered_user;
        }
        throw new Error("Username already in use.");
      default:
        throw new Error("Error registering user.", { cause: error });
    }
  }
  try {
    // Save userip
    await userip.save();
  } catch (error) {
    throw new Error("Error saving userip.", { cause: error });
  }
  try {
    // Save account_connection (if needed)
    if (oauth_data) {
      await account_connection.save();
    }
  } catch (error) {
    throw new Error("Error saving account_connection.", { cause: error });
  }
  // Created user successfully
  // If the user has an avatar, store it and put the avatar url in the database:
  try {
    registered_user.avatar_url = await handle_avatar(
      registered_user,
      user_avatar,
      avatar_url,
      store_avatar
    );
  } catch (error) {
    // Failed to store avatar in db, but we won't stop the registration process.
  }
  // Send email verification token (if not verified already):
  if (!registered_user.email_verified) {
    try {
      await email_verification.generate_email_verification_token(
        registered_user.userid,
        registered_user.email
      );
    } catch (error) {
      throw new Error("Error generating email verification token.", {
        cause: error,
      });
    }
  }
  return registered_user;
}

module.exports = { register_user };
