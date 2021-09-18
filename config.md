# Config

This page explains the different config values and how they're used.

In order to use the config, rename the `config-example.js` file to `config.js`.

## General

`config.fqdn`: The Fully qualified domain name (FQDN), used for emails and OAuth callback URLs. Ex. `https://www.relatedtechnetwork.com` **No trailing slash**.

`config.servicename`: The service name used in emails. Ex. `User Account System`/`Google`/`CompanyName`

## Database

`config.db.connection_string`: The MongoDB connection string used for connecting to the database. Ex. `mongodb://[username:password@]host1[:port1][,...hostN[:portN]][/[defaultauthdb][?options]]`

## User

`config.user.id_length`: The length of the userid. Ex. `10`

`config.user.id_alphabet`: The characters to use in the userid. Ex. `0123456789` (Use numbers or it won't work properly)

`config.user.bcrypt_salt_rounds`: The number of salt rounds bcrypt should do. [Learn more about salt rounds](https://stackoverflow.com/questions/46693430/what-are-salt-rounds-and-how-are-salts-stored-in-bcrypt). Ex. `10`

`config.user.captchaenabled`: Whether [hCaptcha](https://www.hcaptcha.com/) should be enabled or not. Ex. `true`

`config.user.captchasecret`: Your [hCaptcha](https://www.hcaptcha.com/) account secret key. Ex. `0x0000000000000000000000000000000000000000` (You can use this key for testing)

### JWT

`config.user.jwt_auth_secret`: The secret for JWT auth tokens. Ex. `66*F&y9788#276`

`config.user.jwt_email_verification_secret`: The secret for email verification tokens. Ex. `3^782N894$33n$`

`config.user.jwt_password_reset_secret`: The secret for password reset tokens. Ex. `%3$3d444X3&673`

`config.user.jwt_access_token_expiration`: The JWT access token expiration in seconds. Ex. `3600` (This value should be kept low for security purposes as access tokens can't be revoked)

`config.user.jwt_refresh_token_expiration`: The JWT refresh token expiration in seconds. Ex. `2678400` (This should be significantly higher than the access token expiration because when this token expires, the user will need to sign in again)

### OAuth

`config.user.google_client_id`: The [Google client id](https://developers.google.com/identity/protocols/oauth2) (For OAuth).

`config.user.google_client_secret` The [Google client secret](https://developers.google.com/identity/protocols/oauth2) (For OAuth).

`config.user.github_client_id`: The [GitHub client id](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps) (For OAuth).

`config.user.github_client_secret` The [GitHub client secret](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps) (For OAuth).

`config.user.discord_client_id`: The [Discord client id](https://discord.com/developers/docs/topics/oauth2) (For OAuth).

`config.user.discord_client_secret`: The [Discord client secret](https://discord.com/developers/docs/topics/oauth2) (For OAuth).

`config.user.facebook_client_id`: The [Facebook client id](https://developers.facebook.com/docs/facebook-login/access-tokens/) (For OAuth).

`config.user.facebook_client_secret`: The [Facebook client secret](https://developers.facebook.com/docs/facebook-login/access-tokens/) (For OAuth).

### Regex

`config.user.email_regex`: The regex that all user emails must match. You can use something like [this](https://email_regex.com/).

`config.user.username_regex`: The regex that all usernames must match. Ex. `/^(?=.{6,18}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/`

`config.user.password_regex`: The regex that all user passwords must match. Ex. `/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/`

`config.user.captcha_secret_bypass_key`: A special key that will allow bypassing the captcha verification. All requests using this key will automatically be treated as if the user had completed the captcha correctly. Ex. `SuperSecretCaptchaKey`

## Email

`config.email.smtp.hostname`: The SMTP hostname. Ex. `smtp.example.com`

`config.email.smtp.port`: The SMTP port. Ex. `465`

`config.email.smtp.secure`: [Learn more here](https://nodemailer.com/smtp/).

`config.email.from`: Who the email appears to be from. Ex. `'"[Cheese]" <cheese@example.com>'`

`config.email.smtp.auth.user`: The SMTP user's username. Ex. `johndoe`

`config.email.smtp.auth.password`: The SMTP user's password. Ex. `123123123`

## Trustscore

`config.trustscore.emailProvider.Gmail.points`: How much a user's trust score should be increased if using a Gmail address. Ex. `25`

`config.trustscore.emailProvider.Apple.points`: How much a user's trust score should be increased if using an Apple address. Ex. `20`

`config.trustscore.emailProvider.Microsoft.points`: How much a user's trust score should be increased if using a Microsoft address. Ex. `15`

`config.trustscore.emailProvider.Yahoo.points`: How much a user's trust score should be increased if using a Yahoo address. Ex. `10`

`config.trustscore.emailProvider.Protonmail.points`: How much a user's trust score should be increased if using a Protonmail address. Ex. `7`

`config.trustscore.emailProvider.AOL.points`: How much a user's trust score should be increased if using an AOL address. Ex. `10`

`config.trustscore.emailProvider.Yandex.points`: How much a user's trust score should be increased if using a Yandex address. Ex. `10`

`config.trustscore.emailProvider.Education.points`: How much a user's trust score should be increased if using an education (domain with `.edu` TLD) address. Ex. `100`

`config.trustscore.emailProvider.Government.points`: How much a user's trust score should be increased if using a government (domain with `.gov` TLD) address. Ex. `100`

`config.trustscore.emailProvider.Disposable.points`: How much a user's trust score should be "increased" if using a disposable address. Ex. `-15`

`config.trustscore.emailProvider.Unknown.points`: How much a user's trust score should be "increased" if using an unknown provider address. Ex. `0`

`config.trustscore.completedCaptcha.points`: How much a user's trust score should be increased per each completed captcha. Ex. `3`

`config.trustscore.verifiedEmail.points`: How much a user's trust score should be increased per each verified email Ex. `3`

(**NOT IMPLEMENTED YET**)

~`config.trustscore.ip.residential.points`~

~`config.trustscore.ip.vpnproxy.points`~

~`config.trustscore.ip.tor.points`~

~`config.trustscore.ip.server.points`~

~`config.trustscore.accountType.normal.points`~

~`config.trustscore.accountType.premium.points`~

~`config.trustscore.accountType.organization.points`~

~`config.trustscore.verified.points`~

~`config.trustscore.contentRemoved`~

~`config.trustscore.contentRemoved.points`~

~`config.trustscore.contentVerified.points`~
