## jira-node-client - A node client to easily get data from Jira

jira-node-client is a node module providing a function to easily get data from Jira with pages aggreation and retries features.

#### Features
* executes provided Jira rest api and return response
* if response includes several pages (total > maxResults) all pages optionally retrieved and aggregated in the response
* In case of specific errors (5xx, ECONNRESET, ENOTCONN or if the body of the error is 'timeout exceeded'), several attempts are done with a timeout between each ones (5 attempts, 1 second timeout)

#### How to use?
First, make credentials are set as environment variables:
* JIRA_USER
* JIRA_PASSWORD

To check if credentials are set:
```javascript
jira.areJiraCredentialsMissing(); // returns true if any of the 2 credentials is not set
```
To get data:
```javascript
jira.execJiraQuery('https://www.myjirainstance.com/jira/rest/api/latest/search?jql=project = PROJKEY and issuetype not in (Epic,subTaskIssueTypes()) and resolution != Unresolved')
  .then((response) => {
    // response is the JSON object returned by the api
  })
  .catch((error) => {
    // error is an object including 2 properties: code and message
  });
```

#### To do
- [x] provide function to check that credentials are set in environment
- [ ] provide cookie based authentication
- [ ] base url is configured once
- [ ] make timeout and number of retries confugurable
