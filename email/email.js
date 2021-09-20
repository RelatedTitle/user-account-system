const fs = require("fs");

// Popular Email Provider Domains
const gmaildomains = ["gmail.com", "googlemail.com"];
const microsoftdomains = [
  "outlook.com",
  "outlook.com.ar",
  "outlook.com.au",
  "outlook.at",
  "outlook.be",
  "outlook.com.br",
  "outlook.cl",
  "outlook.cz",
  "outlook.dk",
  "outlook.fr",
  "outlook.de",
  "outlook.com.gr",
  "outlook.co.il",
  "outlook.in",
  "outlook.co.id",
  "outlook.ie",
  "outlook.it",
  "outlook.hu",
  "outlook.jp",
  "outlook.kr",
  "outlook.lv",
  "outlook.my",
  "outlook.co.nz",
  "outlook.com.pe",
  "outlook.ph",
  "outlook.pt",
  "outlook.sa",
  "outlook.sg",
  "outlook.sk",
  "outlook.es",
  "outlook.co.th",
  "outlook.com.tr",
  "outlook.com.vn",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "msn.com",
  "live.com",
];
const yahoodomains = [
  "yahoo.at",
  "yahoo.be",
  "yahoo.bg",
  "yahoo.ca",
  "yahoo.cl",
  "yahoo.cn",
  "yahoo.co.hu",
  "yahoo.co.id",
  "yahoo.co.il",
  "yahoo.co.in",
  "yahoo.co.jp",
  "yahoo.co.kr",
  "yahoo.co.nz",
  "yahoo.co.th",
  "yahoo.co.uk",
  "yahoo.co.za",
  "yahoo.com",
  "yahoo.com.ar",
  "yahoo.com.au",
  "yahoo.com.br",
  "yahoo.com.cn",
  "yahoo.com.co",
  "yahoo.com.hk",
  "yahoo.com.hr",
  "yahoo.com.mx",
  "yahoo.com.my",
  "yahoo.com.pe",
  "yahoo.com.ph",
  "yahoo.com.sg",
  "yahoo.com.tr",
  "yahoo.com.tw",
  "yahoo.com.ua",
  "yahoo.com.ve",
  "yahoo.com.vn",
  "yahoo.cz",
  "yahoo.de",
  "yahoo.dk",
  "yahoo.ee",
  "yahoo.es",
  "yahoo.fi",
  "yahoo.fr",
  "yahoo.gr",
  "yahoo.hu",
  "yahoo.ie",
  "yahoo.in",
  "yahoo.it",
  "yahoo.lt",
  "yahoo.lv",
  "yahoo.ne.jp",
  "yahoo.nl",
  "yahoo.no",
  "yahoo.pl",
  "yahoo.pt",
  "yahoo.ro",
  "yahoo.rs",
  "yahoo.se",
  "yahoo.si",
  "yahoo.sk",
  "yahoogroups.ca",
  "yahoogroups.co.in",
  "yahoogroups.co.uk",
  "yahoogroups.com",
  "yahoogroups.com.au",
  "yahoogroups.com.hk",
  "yahoogroups.com.sg",
  "yahoogroups.de",
  "yahooxtra.co.nz",
  "ybb.ne.jp",
  "ymail.com",
];
const appledomains = ["icloud.com", "me.com", "mac.com"];
const protonmaildomains = ["protonmail.com", "pm.me", "protonmail.ch"];
const yandexdomains = ["yandex.com", "yandex.ru"];
const aoldomains = [
  "aim.com",
  "aol.at",
  "aol.be",
  "aol.ch",
  "aol.cl",
  "aol.co.nz",
  "aol.co.uk",
  "aol.com",
  "aol.com.ar",
  "aol.com.au",
  "aol.com.br",
  "aol.com.co",
  "aol.com.mx",
  "aol.com.tr",
  "aol.com.ve",
  "aol.cz",
  "aol.de",
  "aol.dk",
  "aol.es",
  "aol.fi",
  "aol.fr",
  "aol.hk",
  "aol.in",
  "aol.it",
  "aol.jp",
  "aol.kr",
  "aol.nl",
  "aol.pl",
  "aol.ru",
  "aol.se",
  "aol.tw",
];
// Disposable domains (Downloaded in ./server.js)
const disposabledomains = JSON.parse(
  fs.readFileSync("./email/disposabledomains.json", "utf8")
);

function get_email_info(user_email) {
  email = user_email.toLowerCase();
  domain = email.match(/[^@]*$/g)[0];
  realemail = email;

  // Cover your eyes on this one, trust me. Idk how to make it better since I can't really use switches in this case. I have an idea but it means I have to organize the provider list in a different way and I'm too lazy to do that.
  if (gmaildomains.includes(domain)) {
    provider = "Gmail";
    type = 1;
    realemail = gmailsanitize(email, domain);
  } else if (microsoftdomains.includes(domain)) {
    provider = "Microsoft";
    type = 1;
  } else if (yahoodomains.includes(domain)) {
    provider = "Yahoo";
    type = 1;
  } else if (appledomains.includes(domain)) {
    provider = "Apple";
    type = 1;
  } else if (protonmaildomains.includes(domain)) {
    provider = "Protonmail";
    type = 1;
  } else if (yandexdomains.includes(domain)) {
    provider = "Yandex";
    type = 1;
  } else if (aoldomains.includes(domain)) {
    provider = "AOL";
    type = 1;
  } else if (disposabledomains.includes(domain)) {
    provider = "Disposable";
    type = 2;
  } else if (domain.match(/.edu$/) === ".edu") {
    provider = "Educational";
    type = 3;
  } else if (domain.match(/.gov$/) === ".gov") {
    provider = "Government";
    type = 4;
  } else {
    provider = "Unknown";
    type = 0;
  }

  return { type, provider, domain, realemail };
}

// Function to sanitize gmail emails to prevent duplicates, tomato+avocado@gmail.com and t.o.m.a.t.o@googlemail.com are the same.
function gmailsanitize(email, domain) {
  emailusername = email.replace(domain, "");

  return (
    emailusername.replace(/\+.*$/g, "").replace(/[\.@]/g, "") + "@gmail.com"
  );
}

function get_oauth_email(profile, provider) {
  let email = "";
  switch (provider) {
    case "Google":
      email = profile.email;
      break;
    case "Discord":
      email = profile.email;
      break;
    case "GitHub":
      email = profile.emails[0].value;
      break;
    case "Facebook":
      email = profile.emails[0].value;
      break;
  }
  return email;
}

module.exports = {
  gmailsanitize,
  get_email_info,
  get_oauth_email,
};
