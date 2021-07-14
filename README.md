# User Account System

### [Setup](https://github.com/RelatedTitle/user-account-system/wiki/Setup)
### [API Docs](https://github.com/RelatedTitle/user-account-system/wiki/API-Docs)
### [Config](https://github.com/RelatedTitle/user-account-system/wiki/Config)

This project was created mainly just for fun and for personal use. 

The purpose of this project is to make implementing auth in my future projects easier. Please note that this is my first user auth project, so there may be some security vulnerabilities. Passwords are hashed with [bcrypt](https://github.com/kelektiv/node.bcrypt.js) and [JWT](https://jwt.io/)s are used as session tokens. I wouldn't recommend using this in any production environment without auditing it first.

***

### Stack:
* NodeJS
* MongoDB
* Express
* Passport

### Features:
* Full **user registration** and **login**.
* Uses **CAPTCHA** to secure endpoints. Currently supports:
	* [hCaptcha](https://www.hcaptcha.com/)
	* [reCAPTCHA](https://www.google.com/recaptcha/about/)
* **Trustscore** system for verifying that accounts aren't bots/malicious.
* **OAuth** support for the following providers:
	* Discord
	* Facebook
	* GitHub
	* Google
	* Possibly more in the future.
* **JWT** for auth.
* Full **password reset** & **email verification** functionality.
* Ability for users to change their email and password.
* Adding new authenticated routes is easy.
* 2FA Support
