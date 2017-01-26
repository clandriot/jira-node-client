const requestify = require('requestify');
const config = require('./config');
const cookieAuthentication = require('./cookieAuthentication');
let sessionCookie = null;

/**
 * Used to build an url to get more results than 50 when required
 * @param  {String} oldUrl  the previous executed url
 * @param  {Number} startAt new start for the url to build
 * @return {String}         the new url to get next results
 */
let buildUrlToGetNextPage = (oldUrl, startAt) => {
  let url = '';

  if (oldUrl.search('startAt') === -1) {
    url = oldUrl + '&startAt=' + startAt;
  } else {
    let index = oldUrl.search('&startAt=');
    url = oldUrl.replace('&startAt=' + oldUrl.substr(index + 9, oldUrl.length - index + 9), '&startAt=' + startAt);
  }

  return url;
};
/**
 * Builds the header that will be added all requests to Jira
 * @param  {String} url the url that will be executed - this is mandatory for cookie based authentication and useless for basic authentication
 * @return {Promise}     returns the header object and rejects as an {Error}
 */
let getHeader = (url) => new Promise((resolve, reject) => {
  let user = process.env.JIRA_USER;
  let password = process.env.JIRA_PASSWORD;

  if (module.exports.config.authentication === 'cookie') {
    if (sessionCookie) {
      resolve(cookieAuthentication.getHeader(sessionCookie));
    } else {
      cookieAuthentication.login(user, password, url)
        .then((cookie) => {
          sessionCookie = cookie;
          resolve(cookieAuthentication.getHeader(sessionCookie));
        })
        .catch((error) => {
          reject(error);
        });
    }
  } else {
    let token = 'Basic ' + new Buffer(user + ':' + password).toString('base64');
    resolve({
      'Authorization': token,
      'Cache-Control': 'public, max-age=60',
    });
  }
});

let execJiraQueryUntilRecursive = (url, retrieveAllPages, resolve, reject, maxRetry, count) => {
  console.log('try to execute request (' + url + '): ' + count + '/' + maxRetry);

  if (count === maxRetry) {
    console.error('too much retries, stopping here');
    reject({code: -1, url: url, message: 'Too much retries'});
  } else {
    getHeader(url)
      .then((header) => {
        let options = {
          cache: {
            cache: false,
            expires: 30000,
          },
          headers: header,
        };

        requestify.get(url, options)
          .then((response) => {
            console.log('Request OK, code = ' + response.code);
            let jsonBody;
            try {
              jsonBody = JSON.parse(response.body);
            } catch (error) {
              console.error('Error parsing response. Url = ' + url + ', Error = ' + error.message);
              return Promise.reject({code: -1, url: url, message: error.message});
            }
            return jsonBody;
          })
          .then((response) => {
            if (retrieveAllPages && response.startAt !== null && response.startAt + response.maxResults <= response.total) {
              let startAt = response.startAt + response.maxResults;
              let nextPageUrl = buildUrlToGetNextPage(url, startAt);
              execJiraQueryUntil(nextPageUrl, true, 5)  // eslint-disable-line no-use-before-define
                .then((nextPageResponse) => {
                  response.issues = response.issues.concat(nextPageResponse.issues);
                  response.maxResults = response.total;
                  response.startAt = 0;
                  resolve(response);
                })
                .catch((error) => reject(error));
            } else {
              resolve(response);
            }
          })
          .catch((error) => {
            if (error.code === 401 && module.exports.config.authentication === 'cookie') { // cookie expired, gets a new one
              console.log('Error executing request, cookie expired, but I\'ll log in again');
              sessionCookie = null;
              setTimeout(execJiraQueryUntilRecursive, module.exports.config.retryTimeout, url, retrieveAllPages, resolve, reject, maxRetry, count + 1);
            } else if ((error.code === 'ECONNRESET') || (error.code === 'ENOTCONN') || (error.body === 'timeout exceeded') || (Math.floor(error.code / 100) === 5)) {
              console.error('Error executing request, but I\'ll try again... Url = ' + url + ', Error = ' + JSON.stringify(error, null, '\t'));
              setTimeout(execJiraQueryUntilRecursive, module.exports.config.retryTimeout, url, retrieveAllPages, resolve, reject, maxRetry, count + 1);
            } else {
              reject({code: error.code, url: url, message: error.body ? error.body : error.message});
            }
          });
      })
      .catch((error) => {
        reject({code: -1, url: url, message: error.message});
      });
  }
};

let execJiraQueryUntil = (url, retrieveAllPages, maxRetry) => {
  let count = 1;
  return new Promise((resolve, reject) => {
    execJiraQueryUntilRecursive(url, retrieveAllPages, resolve, reject, maxRetry, count);
  });
};

module.exports = {
  /**
   * Configuration
   */
  config,
  /**
   * Return true if Jira credentials are not set as environment variables (JIRA_USER and JIRA_PASSWORD)
   * @return {boolean} true if credentials are missing
   */
  areJiraCredentialsMissing: () => {
    let user = process.env.JIRA_USER;
    let password = process.env.JIRA_PASSWORD;
    let check = (!user || !password);

    return check;
  },
  /** Execute a Jira Rest api and returns the response as a Promise.
   * When the request returns an error 5xx, it is retried 5 times with a 1s timeout in between before returning
   * @param  {String} url               the url to execute
   * @param  {boolean} retrieveAllPages if true and if the query returns more than 50 items, all other items are automatically retrieved and
   * @return {Promise}                  returns the json response, or in case of error an object with 3 properties: code {Number}, url {String}, message {String}
   */
  execJiraQuery: (url, retrieveAllPages) => new Promise((resolve, reject) => {
    execJiraQueryUntil(url, retrieveAllPages, config.maxRetry)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  }),
};
