const { user } = require("../../config.js");
const db = require("../../db/db.js");
const get_oauth_email = require("../../email/email.js").get_oauth_email;
const get_email_info = require("../../email/email.js").get_email_info;

function link_account(user, profile, provider) {
  return new Promise((resolve, reject) => {
    let email = get_email_info(get_oauth_email(profile, provider)).realemail;
    let linked = false;
    user.account_connections.forEach((connection) => {
      if (connection.provider == provider) {
        linked = true; // This user has already linked an account with this provider
      }
    });
    if (linked) {
      return reject("Account already linked");
    }
    // If the provider is GitHub, we know for a fact that the email is verified since it is required to use OAuth. (https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/authorizing-oauth-apps)
    // If the provider is Google, we know whether the email is verified or not by profile.email_verified.
    // If the provider is Discord, we know whether the email is verified by profile.verified.
    // If the provider is Facebook, we don't know whether the email is verified or not.
    if (
      !user.email.verified &&
      user.email.email == email &&
      (profile.email_verified ||
        (provider == "Discord" && profile.verified) ||
        provider == "GitHub")
    ) {
      // User's email address is not verified and matches the one in the account they're linking (which is verified).
      user.email.verified = true; // Verify the email address.
    }
    user.oauth[`${provider.toLowerCase()}oauthid`] = profile.id;
    user.account_connections.push({ provider: provider, data: profile });
    updated_user = new db.user(user);
    updated_user
      .save()
      .then((updated_user) => {
        return resolve(updated_user);
      })
      .catch((err) => {
        if (err.code === 11000) {
          if (
            Object.keys(err.keyValue) ==
            `oauth.${provider.toLowerCase()}oauthid`
          ) {
            // The update failed because the OAuth id has to be unique, if it isn't, it means that the OAuth account has already been linked.
            return reject(
              "This account has already been linked to another account"
            );
          }
        }
        return reject("Error linking account");
      });
  });
}

function link_account_email(profile, provider, email) {
  return new Promise((resolve, reject) => {
    let email = get_email_info(get_oauth_email(profile, provider)).realemail;
    db.user.findOne({ "email.email": email }).then((user) => {
      new_user = new db.user(user);
      // If the provider is GitHub, we know for a fact that the email is verified since it is required to use OAuth. (https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/authorizing-oauth-apps)
      // If the provider is Google, we know whether the email is verified or not by profile.email_verified.
      // If the provider is Discord, we know whether the email is verified by profile.verified.
      // If the provider is Facebook, we don't know whether the email is verified or not.
      // Verify email if necessary
      if (
        profile.email_verified ||
        (provider == "Discord" && profile.verified) ||
        provider == "GitHub"
      ) {
        // User's email address is not verified and matches the one in the account they're linking (which is verified).
        new_user.email.verified = true; // Verify the email address.
      }
      // Verify email in emailhistory if necessary
      new_user.emailhistory.forEach((email) => {
        if (
          (email == email && profile.email_verified) ||
          (provider == "Discord" && profile.verified) ||
          provider == "GitHub"
        ) {
          // User's email address is not verified and matches the one in the account they're linking (which is verified).
          email.verified = true; // Verify the email address.
        }
      });
      // Link the account
      new_user.oauth[`${provider.toLowerCase()}oauthid`] = profile.id;
      new_user.account_connections.push({ provider: provider, data: profile });
      new_user
        .save()
        .then((updated_user) => {
          // Linked accounts
          resolve(updated_user);
        })
        .catch((err) => {
          reject("Error");
        });
    });
  });
}

module.exports = { link_account_email, link_account };
