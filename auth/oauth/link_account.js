const db = require("../../db/db.js");
const get_oauth_email = require("../../email/email.js").get_oauth_email;
const get_email_info = require("../../email/email.js").get_email_info;

async function link_account(user, profile, provider) {
  let email = get_email_info(get_oauth_email(profile, provider)).real_email;
  let linked = false;
  try {
    // Find account connection for the user and given provider.
    var account_connection = await db.account_connection.findOne({
      where: { userUserid: user.userid, provider: provider },
    });
  } catch (error) {
    throw new Error("Error finding account connection.", { cause: error });
  }
  if (account_connection) {
    linked = true;
  }

  if (linked) {
    throw new Error("Account already linked.");
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
  try {
    await db.account_connection.create({
      userUserid: user.userid,
      provider: provider,
      id: profile.id,
      data: profile,
    });
  } catch (error) {
    if (Object.keys(error.fields)[0] == "id") {
      // The update failed because the OAuth id has to be unique, if it isn't, it means that the OAuth account has already been linked.
      throw new Error(
        "This account has already been linked to another account."
      );
    }
    throw new Error("Error linking account.", error);
  }
  return user;
}

async function link_account_email(profile, provider) {
  let email = get_email_info(get_oauth_email(profile, provider)).real_email;
  try {
    var user = db.user.findOne({ where: { email: email } });
  } catch (error) {
    throw new Error("Error finding user.", { cause: error });
  }
  try {
    // Link the account
    await db.account_connection.create({
      userUserid: user.userid,
      id: profile.id,
      provider: provider,
      data: profile,
    });
  } catch (error) {
    throw new Error("Error linking account.", error);
  }

  // Verify email if necessary
  if (
    profile.email_verified ||
    (provider == "Discord" && profile.verified) ||
    provider == "GitHub"
  ) {
    // User's email address is not verified and matches the one in the account they're linking (which is verified).
    try {
      await db.user.update(
        { email_verified: true },
        { where: { userid: user.userid } }
      );
    } catch (error) {
      throw new Error("Error verifying email.", { cause: error });
    }
    user.email_verified = true;
  }
  return user;
}

module.exports = { link_account_email, link_account };
