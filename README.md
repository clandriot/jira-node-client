## jira-node-client - A node client to easily get data from Jira

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
- [ ] provide cookie based authentication
- [ ] base url is configured once
- [x] make timeout and number of retries configurable
