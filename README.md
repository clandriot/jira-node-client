## jira-node-client - A node client to easily get data from Jira

[![Build Status](https://secure.travis-ci.org/clandriot/jira-node-client.png?branch=master)](http://travis-ci.org/clandriot/jira-node-client) [![Coverage Status](https://coveralls.io/repos/github/clandriot/jira-node-client/badge.svg)](https://coveralls.io/github/clandriot/jira-node-client) [![Dependency Status](https://www.versioneye.com/user/projects/587cc73f5a9a49003f91d136/badge.svg?style=flat-square)](https://www.versioneye.com/user/projects/587cc73f5a9a49003f91d136) [![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/clandriot/jira-node-client/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/clandriot/jira-node-client/?branch=master)

jira-node-client is a node module providing a function to easily get data from Jira with pages aggreation and retries features.

#### Features
* executes provided Jira rest api and return response
* if response includes several pages (total > maxResults) all pages optionally retrieved and aggregated in the response
* In case of specific errors (5xx, ECONNRESET, ENOTCONN or if the body of the error is 'timeout exceeded'), several attempts are done with a timeout between each ones (5 attempts, 1 second timeout)

#### Installation
```
npm install jira-node-client
```

#### How to use?
First, make sure credentials are set as environment variables:
* JIRA_USER
* JIRA_PASSWORD

##### To check if credentials are set
```javascript
const jira = require('jira-node-client');
jira.areJiraCredentialsMissing(); // returns true if any of the 2 credentials is not set
```

#### Authentication
Default behavior is basic authentication, meaning that user and password are set in the header of each request to Jira.
But you can also enable cookie based authentication, meaning that a first login will retrieve a cookie that will be added to all further api calls. If your application runs long enough to reach cookie expiration, this is detected and a new cookie is automatically retrieved. This will so remain transparent.
To enable cookie based authentication
```javascript
const jira = require('jira-node-client');
jira.config.authentication = 'cookie'; // enable cookie based authentication
```

##### To get data
```javascript
const jira = require('jira-node-client');
jira.execJiraQuery('https://www.myjirainstance.com/jira/rest/api/latest/search?jql=project = PROJKEY and issuetype not in (Epic,subTaskIssueTypes()) and resolution != Unresolved', true)
  .then((response) => { // response is the JSON object returned by the api
    let nbIssues = response.total;
    let firstIssueKey = response.issues[0].key;
  })
  .catch((error) => {
    // error is an object including 2 properties: code and message
  });
```
Note: Jira REST Apis and JSON format can be found at https://docs.atlassian.com/jira/REST/cloud/.

##### To configure
You can configure retry behavior
```javascript
const jira = require('jira-node-client');
jira.config.maxRetry = 10 // On server errors, retries to execute the api 10 time; default is 5
jira.config.retryTimeout = 5000 // wait 5000ms between each retry; default is 1000ms
```

#### Running tests
To run the tests suite, first install devlopment dependencies:
```
npm install
```
Then run the tests:
```
npm test
```
To check code coverage, run:
```
npm run cover
```

#### To do
- [x] provide function to check that credentials are set in environment
- [x] provide cookie based authentication
- [ ] base url is configured once
- [x] make timeout and number of retries configurable
