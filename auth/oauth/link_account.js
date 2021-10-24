const { user } = require("../../config.js");
const db = require("../../db/db.js");
const get_oauth_email = require("../../email/email.js").get_oauth_email;
const get_email_info = require("../../email/email.js").get_email_info;

function link_account(user, profile, provider) {
  return new Promise(async (resolve, reject) => {
    let email = get_email_info(get_oauth_email(profile, provider)).realemail;
    let linked = false;
    await db.account_connection
      .findOne({ where: { userUserid: user.userid, provider: provider } })
      .then((account_connection) => {
        if (account_connection) {
          linked = true;
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
      !user.email_verified &&
      user.email == email &&
      (profile.email_verified ||
        (provider == "Discord" && profile.verified) ||
        provider == "GitHub")
    ) {
      // User's email address is not verified and matches the one in the account they're linking (which is verified).
      user.email_verified = true; // Verify the email address.
    }
    db.account_connection
      .create({
        userUserid: user.userid,
        provider: provider,
        id: profile.id,
        data: profile,
      })
      .catch((err) => {
        if (Object.keys(err.fields)[0] == "id") {
          // The update failed because the OAuth id has to be unique, if it isn't, it means that the OAuth account has already been linked.
          return reject(
            "This account has already been linked to another account"
          );
        }
        return reject("Error linking account");
      });
    return resolve(user);
  });
}

function link_account_email(profile, provider, email) {
  return new Promise((resolve, reject) => {
    let email = get_email_info(get_oauth_email(profile, provider)).realemail;
    db.user.findOne({ where: { email: email } }).then((user) => {
      // Link the account
      account_connection = db.account_connection
        .create({
          userUserid: user.userid,
          id: profile.id,
          provider: provider,
          data: profile,
        })
        .then(async () => {
          // Verify email if necessary
          if (
            profile.email_verified ||
            (provider == "Discord" && profile.verified) ||
            provider == "GitHub"
          ) {
            // User's email address is not verified and matches the one in the account they're linking (which is verified).
            await db.user
              .update(
                { email_verified: true },
                { where: { userid: user.userid } }
              )
              .then(() => {
                user.email_verified = true;
              })
              .catch(() => {
                return reject("Error verifying email");
              });
          }
          return resolve(user);
        })
        .catch(() => {
          return reject("Error linking account");
        });
    });
  });
}

module.exports = { link_account_email, link_account };
