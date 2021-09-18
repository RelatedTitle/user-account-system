# API Docs

For authenticated endpoints, the **access token** should be sent in a header called "secret_token".

Example:

```
{
"secret_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MjYwNjkxMjV9.eIFU1TpYZ5DCTeoV5hizd-8ExvMs_mo4DAQfAOpQhm4"
}
```

---

## Endpoints:

### `POST /auth/register`

This endpoint is used for registering new users.

Body:

`email`: The user's email, must be unique and match the email regex set in config. (**Required**)

`username`: The user's username, must be unique and match the username regex set in config. (**Required**)

`password`: The user's password, must follow the password regex set in config. (**Required**)

`h-captcha-response`: The hCaptcha response token from the widget. (Required if hCaptcha is enabled)

TIP: You can use `10000000-aaaa-bbbb-cccc-000000000001` as the `h-captcha-response` token for testing.

Example request:

```
curl -d "email=john@example.com&username=johndoe&password=123123123@Aa&h-captcha-response=10000000-aaaa-bbbb-cccc-000000000001" -X POST http://localhost/auth/register
```

Example response:

```
{
    "error": false, // Whether there was an error or not.
    "message": "User registered successfully",
    "user": {
        "userid": 5901057193,
        "username": "johndoe",
        "email": "john@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MjYwNjkxMjV9.eIFU1TpYZ5DCTeoV5hizd-8ExvMs_mo4DAQfAOpQhm4",
// Access token, used for authenticated endpoints.
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNjI2MDY5MTI1fQ.T2UYeumro0vjZorNm9VnQXs6Ckzpcm9Dic7oWTm6Qb0"
// Refresh token, used for refreshing the access token (using the /auth/refreshToken endpoint).
}
```

### `POST /auth/login`

This endpoint is used for logging in existing users.

Body:

`email`: The user's email. (**Required**)

`password`: The user's password. (**Required**)

Example request:

```
curl -d "email=john@example.com&password=123123123@Aa" -X POST http://localhost/auth/login
```

Example response:

```
{
    "error": false, // Whether there was an error or not.
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MjYwNjkxMjV9.eIFU1TpYZ5DCTeoV5hizd-8ExvMs_mo4DAQfAOpQhm4",
// Access token, used for authenticated endpoints.
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNjI2MDY5MTI1fQ.T2UYeumro0vjZorNm9VnQXs6Ckzpcm9Dic7oWTm6Qb0"
// Refresh token, used for refreshing the access token (using the /auth/refreshToken endpoint).
}
```

### `POST /auth/refreshToken`

This endpoint is used for issuing a new access token using the refresh token.

Body:

`refreshToken`: The user's active refresh token. (**Required**)

Example request:

```
curl -d "refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNjI2MDc4MTQ3fQ.LuHdkFUM5N6ldZfid5R4Qo2tZUVCt6Lte_trjpluDnI" -X POST http://localhost/auth/refreshToken
```

Example response:

```
{
    "error": false, // Whether there was an error or not.
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MjYwNzgxODh9.NS772UinKM_zShARHpAKGXGgl1B7wBiY09HHIVPEMYA"
    // Access token, used for authenticated endpoints.
}
```

### `POST /auth/requestPasswordReset`

This endpoint is used for requesting password resets. If a user with the provided email exists, a password reset email will be sent. The user can then reset their password by following the link in the email.

Body:

`email`: The user's email. (**Required**)

Example request:

```
curl -d "email=john@example.com" -X POST http://localhost/auth/requestPasswordReset
```

Example response:

```
{
    "error": false, // Whether there was an error or not.
    "message": "Password reset email sent"
}
```

### `POST /auth/resetPassword`

This endpoint is used for resetting a user's password (after requesting a password reset). This endpoint requires a password reset token which should be included as a parameter/query in a link to the frontend in the password reset email. The frontend should then send this request with the token and the new password the user chose.

Ex. `http://localhost/frontend/resetPassword?eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJ0eXBlIjoicGFzc3dvcmRyZXNldCIsImlhdCI6MTYyNjA3ODUyN30.7eQbRTdb9NGyD_wHkbqW9WyUPR7XKeSEMzhz4hDm08o`

Body:

`passwordResetToken`: The password reset token included as a parameter in a link to the frontend in the password reset email. (**Required**)

`password`: The user's new password, must follow the password regex set in config and be different from the current one. (**Required**)

Example request:

```
curl -d "passwordResetToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJ0eXBlIjoicGFzc3dvcmRyZXNldCIsImlhdCI6MTYyNjA3ODUyN30.7eQbRTdb9NGyD_wHkbqW9WyUPR7XKeSEMzhz4hDm08o&password=321321321@Aa" -X POST http://localhost/auth/resetPassword
```

Example response:

```
{
    "error": false, // Whether there was an error or not.
    "message": "Password changed successfully"
}
```

### `POST /auth/verifyEmail/`

This endpoint is used for verifying a user's email (after changing it or sign up). This endpoint requires an email verification token which should be included as a parameter/query in a link to the frontend in the verification email. The frontend should then send this request with the token.

Ex. `http://localhost/frontend/verifyEmail?eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOjc3NDkyMDI5MTUsImVtYWlsIjoiam9objFAZXhhbXBsZS5jb20iLCJ0eXBlIjoiZW1haWx2ZXJpZmljYXRpb24iLCJpYXQiOjE2MjYwNzUyNTJ9.91OenVYqNUMDCFvNtmklKZH6ViqkRDLwQXJmMjp5pwI`

Body:

`email_verification_token`: The email verification token included as a parameter in a link to the frontend in the verification email. (**Required**)

Example request:

```
curl -d "email_verification_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOjc3NDkyMDI5MTUsImVtYWlsIjoiam9objFAZXhhbXBsZS5jb20iLCJ0eXBlIjoiZW1haWx2ZXJpZmljYXRpb24iLCJpYXQiOjE2MjYwNzUyNTJ9.91OenVYqNUMDCFvNtmklKZH6ViqkRDLwQXJmMjp5pwI" -X POST http://localhost/auth/verifyEmail
```

Example response:

```

{
"error": false, // Whether there was an error or not.
"message": "Email verified successfully"
}

```

### `POST /user/changePassword`

This endpoint is used for changing a user's password.

Headers:

`secret_token`: The user's active access token.

Body:

`old_password`: The user's old password. (**Required**)

`new_password`: The user's new password (The one to be changed to), must follow the password regex set in config and be different from the current one. (**Required**)

Example request:

```

curl -H "secret_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MjYwNjkxMjV9.eIFU1TpYZ5DCTeoV5hizd-8ExvMs_mo4DAQfAOpQhm4" -d "old_password=123123123@Aa&new_password=321321321@Aa" -X POST http://localhost/user/changePassword

```

Example response:

```

{
"error": false, // Whether there was an error or not.
"message": "Password changed successfully"
}

```

### `POST /user/changeEmail`

This endpoint is used for changing a user's email. The user has to verify the new email (by following the link sent) in order for it to become the active email.

Headers:

`secret_token`: The user's active access token.

Body:

`email`: The user's new email (The one to be changed to), must follow the email regex set in config and be different from the current one. (**Required**)

Example request:

```

curl -H "secret_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6NTkwMTA1NzE5MywiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MjYwNjkxMjV9.eIFU1TpYZ5DCTeoV5hizd-8ExvMs_mo4DAQfAOpQhm4" -d "email=john2@example.com" -X POST http://localhost/user/changeEmail

```

Example response:

```

{
"error": false, // Whether there was an error or not.
"message": "Email verification sent successfully"
}

```

```

```
