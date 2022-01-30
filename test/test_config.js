var config = {};

config.trustscore = {};
config.db = {};
config.user = {};
config.email = {};

// Cloudflare

config.cloudflare = {};

config.cloudflare.enabled = false;
config.cloudflare.ip_geo_enabled = false;

// General:

config.fqdn = "http://localhost"; // Frontend FQDN
config.backend_fqdn = "http://localhost"; // Backend FQDN
config.servicename = "RelatedTechNetwork";
config.usingproxy = config.cloudflare.enabled || false;
config.port = 80;

// Rate Limiting:

config.ratelimits = [];

config.ratelimits[0] = {
  route: "/auth/",
  window: 10 * 60 * 1000,
  maxrequests: 1000,
};

config.ratelimits[1] = {
  route: "/user/",
  window: 10 * 60 * 1000,
  maxrequests: 5000,
};

// CAPTCHA:

config.captcha_secret_bypass_key = "";

config.hcaptcha = {};
config.hcaptcha.enabled = true;
config.hcaptcha.secret = "0x0000000000000000000000000000000000000000";

config.recaptcha = {};
config.recaptcha.enabled = true;
config.recaptcha.secret = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

// DB
config.db.connection_string =
  "postgres://postgres:postgres@localhost:5432/postgres";

// User

config.user.id_length = 10;
config.user.id_alphabet = "0123456789";
config.user.bcrypt_salt_rounds = 10;
config.user.jwt_auth_secret = "test_secret";
config.user.jwt_email_verification_secret = "test_secret";
config.user.jwt_password_reset_secret = "test_secret";
config.user.jwt_new_ip_secret = "test_secret";
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
config.user.avatar.quality = 90;
config.user.avatar.store_gravatar = true;
config.user.avatar.max_size = 150 * 1024;

config.user.avatar.storage_location = "local";

config.user.avatar.s3 = {};

config.user.avatar.s3.access_key = "";
config.user.avatar.s3.secret_access_key = "";
config.user.avatar.s3.bucket = "";

// Email:

config.email.send_email = false;

config.email.smtp = {};

config.email.smtp.hostname = "";
config.email.smtp.port = "";
config.email.smtp.secure = false;

config.email.from = "";

config.email.smtp.auth = {};

config.email.smtp.auth.user = "";
config.email.smtp.auth.password = "";

module.exports = config;
