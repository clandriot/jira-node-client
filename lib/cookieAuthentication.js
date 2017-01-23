const requestify = require('requestify');

let getBaseUrl = (url) => {
  if (!url) {
    throw new Error('url not specified - can\'t get base url');
  }
  let index = url.indexOf('rest/');
  if (index === -1) {
    throw new Error('Invalid url (can\'t find \'rest/\' string) - can\'t get base url');
  }
  let baseUrl = url.substr(0, index + 5);

  return baseUrl;
};

let extractSessionCookie = (cookies, cookieName) => {
  if (!cookieName) {
    throw new Error('cookie name not specified - can\'t extract session cookie');
  }
  if (!cookies) {
    throw new Error('cookies not specified - can\'t extract session cookie');
  }
  if (!Array.isArray(cookies)) {
    throw new Error('cookies is not an array - can\'t extract session cookie');
  }

  try {
    var sessionCookie = cookies.find((cookie) => { // eslint-disable-line no-var
      let name = cookie.split('=')[0];
      let value = cookie.split('=')[1].split(';')[0];
      return ((name === cookieName) && (value != '""'));
    }).split(';')[0];
  } catch (error) {
    throw new Error('cookie name not found in cookies - can\'t extract session cookie');
  }

  return sessionCookie;
};

module.exports = {
  login: (userName, password, url) => new Promise((resolve, reject) => {
    try {
      let loginUrl = getBaseUrl(url) + 'auth/1/session';
      let body = {'username': userName, 'password': password};
      let options = {
        cache: {
          cache: false,
        },
      };

      requestify.post(loginUrl, body, options)
        .then((response) => {
          resolve(extractSessionCookie(response.headers['set-cookie'], JSON.parse(response.body).session.name));
        })
        .catch((error) => {
          reject(new Error('Can\'t get cookie [' + error.message + ']'));
        });
    } catch (error) {
      reject(new Error('Can\'t get cookie [' + error.message + ']'));
    }
  }),
  getHeader: (sessionCookie) => {
    return {'cookie': sessionCookie, 'Cache-Control': 'public, max-age=60'};
  },
};
