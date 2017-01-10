const requestify = require('requestify');
const config = require('./config.js');

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

let execJiraQueryUntilRecursive = (url, retrieveAllPages, resolve, reject, maxRetry, count) => {
  console.log('try to execute request (' + url + '): ' + count + '/' + maxRetry);

  if (count === maxRetry) {
    console.error('too much retries, stopping here');
    reject({code: -1, url: url, message: 'Too much retries'});
  } else {
    let user = process.env.JIRA_USER;
    let password = process.env.JIRA_PASSWORD;
    let token = 'Basic ' + new Buffer(user + ':' + password).toString('base64');

    let options = {
      cache: {
        cache: true,
        expires: 30000,
      },
      headers: {
        'method': 'get',
        'muteHttpExceptions': true,
        'contentType': 'application/json',
        'validateHttpsCertificates': false,
        'Authorization': token,
        'Cache-Control': 'public, max-age=60',
      },
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
        if ((error.code === 'ECONNRESET') || (error.code === 'ENOTCONN') || (error.body === 'timeout exceeded') || (Math.floor(error.code / 100) === 5)) {
          console.error('Error executing request, but I\'ll try again... Url = ' + url + ', Error = ' + JSON.stringify(error, null, '\t'));
          setTimeout(execJiraQueryUntilRecursive, module.exports.config.retryTimeout, url, retrieveAllPages, resolve, reject, maxRetry, count + 1);
        } else {
          reject({code: error.code, url: url, message: error.body ? error.body : error.message});
        }
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
    let check = true;
    let user = process.env.JIRA_USER;
    let password = process.env.JIRA_PASSWORD;

    check = (!user || !password);

    return check;
  },
  /** Execute a Jira Rest api and returns the response as a Promise.
   * When the request returns an error 5xx, it is retried 5 times with a 1s timeout in between before returning
   * @param  {String} url               the url to execute
   * @param  {boolean} retrieveAllPages if true and if the query returns more than 50 items, all other items are automatically retrieved and
   * @return {Promise}                  returns the json response, or in case of error an object with 3 properties: code {Number}, url {String}, message {String}
   */
  execJiraQuery: (url, retrieveAllPages) => new Promise((resolve, reject) => {
    execJiraQueryUntil(url, retrieveAllPages, module.exports.config.maxRetry)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  }),
};
