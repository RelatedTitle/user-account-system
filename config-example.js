var config = {};

config.trustscore = {};
config.db = {};
config.user = {};

// General:

config.fqdn = "http://localhost"; // Change this
config.servicename = "User Account System"; // Change this
config.usingproxy = false;

// Rate Limiting:

config.ratelimits = [];

config.ratelimits[0] = {
  route: "/auth/",
  window: 10 * 60 * 1000,
  maxrequests: 20,
};

config.ratelimits[1] = {
  route: "/user/",
  window: 10 * 60 * 1000,
  maxrequests: 5,
};

// CAPTCHA:

config.captcha_secret_bypass_key_enabled = true;
config.captcha_secret_bypass_key = "";

config.hcaptcha = {};
config.hcaptcha.enabled = true;
config.hcaptcha.secret = "";

config.recaptcha = {};
config.recaptcha.enabled = true;
config.recaptcha.secret = "";

// DB
config.db.connection_string = "";

// User

config.user.id_length = 10;
config.user.id_alphabet = "0123456789";
config.user.bcrypt_salt_rounds = 10;
config.user.jwt_auth_secret = "";
config.user.jwt_email_verification_secret = "";
config.user.jwt_password_reset_secret = "";
config.user.jwt_new_ip_secret = "";
config.user.jwt_access_token_expiration = 3600; // In seconds (3600 = 1 hour)
config.user.jwt_refresh_token_expiration = 2678400; // In seconds (2678400 = 31 days)
config.user.google_client_id = "";
config.user.google_client_secret = "";
config.user.github_client_id = "";
config.user.github_client_secret = "";
config.user.discord_client_id = "";
config.user.discord_client_secret = "";
config.user.facebook_client_id = "";
config.user.facebook_client_secret = "";
config.user.email_regex =
  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
config.user.username_regex =
  /^(?=.{6,18}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/;
config.user.password_regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/;

// Avatar
config.user.avatar = {};

config.user.avatar.size = 250;
config.user.avatar.compression_level = 6;
config.user.avatar.store_gravatar = true;
config.user.avatar.max_size = 150 * 1024;

// Email:

config.email.smtp = {};

config.email.smtp.hostname = "";
config.email.smtp.port = "";
config.email.smtp.secure = "";

config.email.from = '"[Cheese]" <cheese@example.com>';

config.email.smtp.auth = {};

config.email.smtp.auth.user = "";
config.email.smtp.auth.password = "";

// Trustscore

// Email:
config.trustscore.emailProvider = {};

config.trustscore.emailProvider.Gmail = {};
config.trustscore.emailProvider.Gmail.points = 25;

config.trustscore.emailProvider.Apple = {};
config.trustscore.emailProvider.Apple.points = 20;

config.trustscore.emailProvider.Microsoft = {};
config.trustscore.emailProvider.Microsoft.points = 15;

config.trustscore.emailProvider.Yahoo = {};
config.trustscore.emailProvider.Yahoo.points = 10;

config.trustscore.emailProvider.Protonmail = {};
config.trustscore.emailProvider.Protonmail.points = 7;

config.trustscore.emailProvider.AOL = {};
config.trustscore.emailProvider.AOL.points = 10;

config.trustscore.emailProvider.Yandex = {};
config.trustscore.emailProvider.Yandex.points = 10;

config.trustscore.emailProvider.Education = {};
config.trustscore.emailProvider.Education.points = 100;

config.trustscore.emailProvider.Government = {};
config.trustscore.emailProvider.Government.points = 500;

config.trustscore.emailProvider.Disposable = {};
config.trustscore.emailProvider.Disposable.points = -15;

config.trustscore.emailProvider.Unknown = {};
config.trustscore.emailProvider.Unknown.points = 0;

config.trustscore.completedCaptcha = {};
config.trustscore.completedCaptcha.points = 3;
config.trustscore.verifiedEmail = {};
config.trustscore.verifiedEmail.points = 3;

// IP:

config.trustscore.ip = {};

config.trustscore.ip.residential = {};
config.trustscore.ip.residential.points = 10;

config.trustscore.ip.vpnproxy = {};
config.trustscore.ip.vpnproxy.points = -5;

config.trustscore.ip.tor = {};
config.trustscore.ip.tor.points = -5;

config.trustscore.ip.server = {};
config.trustscore.ip.server.points = -10;

// Account:
config.trustscore.accountType = {};

config.trustscore.accountType.normal = {};
config.trustscore.accountType.normal.points = 0;

config.trustscore.accountType.premium = {};
config.trustscore.accountType.premium.points = 30;

config.trustscore.accountType.organization = {};
config.trustscore.accountType.organization.points = 50;

config.trustscore.verified = {};
config.trustscore.verified.points = 100;

// Content:

config.trustscore.contentRemoved = {};
config.trustscore.contentRemoved.points = -10;

config.trustscore.contentVerified = {};
config.trustscore.contentVerified.points = 5;

module.exports = config;
