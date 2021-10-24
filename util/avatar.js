const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const crypto = require("crypto");
const AWS = require("aws-sdk");
const config = require("../config.js");

function gravatar_image(email) {
  email = email.toLowerCase().trim();
  return `https://www.gravatar.com/avatar/${crypto
    .createHash("md5")
    .update(email)
    .digest("hex")}?d=404&s=${config.user.avatar.size}`;
}

// Compresses, resizes, and converts the avatar to a png
function process_avatar(avatar) {
  return new Promise((resolve, reject) => {
    sharp(avatar)
      .resize({
        height: config.user.avatar.size,
        width: config.user.avatar.size,
      })
      .png({ compressionLevel: config.user.avatar.compression_level })
      .toBuffer()
      .then((processed_avatar) => {
        return resolve(processed_avatar);
      })
      .catch((error) => {
        return reject(error);
      });
  });
}

function store_locally(avatar, filename) {
  return new Promise((resolve, reject) => {
    const file_stored = () => {
      return resolve(`${config.fqdn}/avatars/${filename}`);
    };
    try {
      fs.writeFile(`./content/avatars/${filename}`, avatar, file_stored);
    } catch (err) {
      return reject("Failed to store avatar.");
    }
  });
}

function store_s3(avatar, filename) {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3({
      accessKeyId: config.user.avatar.s3.access_key,
      secretAccessKey: config.user.avatar.s3.secret_access_key,
    });
    s3.upload(
      {
        Bucket: config.user.avatar.s3.bucket,
        Key: `avatars/${filename}`,
        Body: avatar,
      },
      function (err, data) {
        if (!err) {
          return resolve(data.Location);
        }
        return reject("Failed to store avatar.");
      }
    );
  });
}

function store_avatar(avatar) {
  return new Promise(async (resolve, reject) => {
    let n = 10;
    let random_number =
      1 +
      Math.floor(Math.random() * 9) +
      Math.random()
        .toFixed(n - 1)
        .split(".")[1];
    // Store avatar on the preferred storage location
    switch (config.user.avatar.storage_location) {
      case "local":
        try {
          return resolve(await store_locally(avatar, `${random_number}.png`)); // Return avatar URL if successful
        } catch (error) {
          return reject(error);
        }
      case "s3":
        try {
          return resolve(await store_s3(avatar, `${random_number}.png`)); // Return avatar URL if successful
        } catch (error) {
          return reject(error);
        }
    }
  });
}

function download_avatar(avatar_url) {
  return new Promise((resolve, reject) => {
    axios
      .get(avatar_url, { responseType: "arraybuffer" })
      .then((response) => {
        return resolve(response.data);
      })
      .catch((error) => {
        return reject(error);
      });
  });
}

function upload_avatar(avatar, avatar_url) {
  return new Promise(async (resolve, reject) => {
    if (avatar_url) {
      // If an avatar URL is provided instead of the avatar itself, download the avatar
      // Get avatar
      try {
        avatar = await download_avatar(avatar_url);
      } catch (error) {
        // Failed to download avatar from URL
        return reject("Failed to download avatar.");
      }
    }
    // Process avatar
    try {
      avatar = await process_avatar(avatar);
    } catch (error) {
      // Failed to process avatar
      return reject("Failed to process avatar.");
    }

    if (avatar.toString().length > config.user.avatar.max_size) {
      // Avatar is too large
      return reject("Avatar is too large.");
    }

    // Store avatar
    return resolve(await store_avatar(avatar));
  });
}

function get_oauth_avatar(profile, provider) {
  let avatar = "";
  switch (provider) {
    case "Google":
      avatar = profile.picture;
      break;
    case "Discord":
      avatar = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}`;
      break;
    case "GitHub":
      avatar = profile.photos?.[0]?.value;
      break;
    case "Facebook":
      avatar = undefined; // Idk
      break;
  }
  return avatar;
}

module.exports = {
  gravatar_image,
  download_avatar,
  process_avatar,
  store_avatar,
  get_oauth_avatar,
  upload_avatar,
};
