const test = require('unit.js');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const rewire = require('rewire');
const requestify = require('requestify');
const jira = rewire('../lib/jira.js');
const testThat = test.promise;
let sandbox = null;

before(() => chai.use(chaiAsPromised));

beforeEach(() => sandbox = sinon.sandbox.create());

afterEach(() => sandbox.restore());

describe('buildUrlToGetNextPage', () => {
  let buildUrl = jira.__get__('buildUrlToGetNextPage');
  it('buildUrlToGetNextPage() appends &startAt=50 to base url', () => testThat
      .given(() => 'http://host/any')
      .when((oldUrl) => buildUrl(oldUrl, 50))
      .then((newUrl) => expect(newUrl).to.be.equal('http://host/any&startAt=50'))
  );
  it('buildUrlToGetNextPage() replace existing startAt with new one', () => testThat
      .given(() => 'http://host/any&startAt=100')
      .when((oldUrl) => buildUrl(oldUrl, 150))
      .then((newUrl) => expect(newUrl).to.equal('http://host/any&startAt=150'))
  );
});

describe('areJiraCredentialsMissing', () => {
  it('areJiraCredentialsMissing() returns true without JIRA_USER and JIRA_PASSWORD', () => {
    delete process.env.JIRA_USER;
    delete process.env.JIRA_PASSWORD;
    testThat
      .given()
      .when(() =>jira.areJiraCredentialsMissing())
      .then((status) => expect(status).to.be.true);
  });
  it('areJiraCredentialsMissing() returns true with only JIRA_PASSWORD missing', () => {
    process.env.JIRA_USER = 'user';
    delete process.env.JIRA_PASSWORD;
    testThat
      .given()
      .when(() =>jira.areJiraCredentialsMissing())
      .then((status) => expect(status).to.be.true);
  });
  it('areJiraCredentialsMissing() returns true with only JIRA_USER missing', () => {
    process.env.JIRA_PASSWORD = 'pwd';
    delete process.env.JIRA_USER;
    testThat
      .given()
      .when(() =>jira.areJiraCredentialsMissing())
      .then((status) => expect(status).to.be.true);
  });
  it('areJiraCredentialsMissing() returns false if JIRA_USER and JIRA_PASSWORD are set', () => {
    process.env.JIRA_PASSWORD = 'pwd';
    process.env.JIRA_USER = 'user';
    testThat
      .given()
      .when(() =>jira.areJiraCredentialsMissing())
      .then((status) => expect(status).to.be.false);
  });
});

describe('execJiraQuery', function() {
  it('execJiraQuery returns parsed response on 200', () => {
    sandbox.stub(requestify, 'get', (url, option) => {
      return Promise.resolve({code: 200, body: '{"message": "successful!!"}'});
    });
    return expect(jira.execJiraQuery('', false)).to.eventually.have.property('message', 'successful!!');
  });
  it('execJiraQuery returns error on 400', () => {
    sandbox.stub(requestify, 'get', (url, option) => {
      return Promise.reject({code: 400, body: 'Failed!'});
    });
    return expect(jira.execJiraQuery('', false)).to.eventually.be.rejected;
  });
  it('execJiraQuery returns error on 500', function() {
    this.timeout(8000); // need to increase Mocha timeout to give enough time to the retries
    sandbox.stub(requestify, 'get', (url, option) => {
      return Promise.reject({code: 500, body: 'Failed!'});
    });
    return expect(jira.execJiraQuery('', false)).to.eventually.be.rejected;
  });
  it('execJiraQuery returns error on 502', function() {
    this.timeout(8000); // need to increase Mocha timeout to give enough time to the retries
    sandbox.stub(requestify, 'get', (url, option) => {
      return Promise.reject({code: 502, body: 'Failed!'});
    });
    return expect(jira.execJiraQuery('', false)).to.eventually.be.rejected;
  });
  it('execJiraQuery fails with a not JSON response', () => {
    sandbox.stub(requestify, 'get', (url, option) => {
      return Promise.resolve({code: 200, body: 'Not JSON'});
    });
    return expect(jira.execJiraQuery('', false)).to.eventually.be.rejected
      .then((error) => {
        expect(error).to.have.property('code', -1);
        expect(error).to.have.property('message', 'Unexpected token N in JSON at position 0');
      });
  });
  it('execJiraQuery aggregates results  if retrieveAllPages = true and if response specifies multiple pages', () => {
    let first = '{"resultset": "first"}';
    let second = '{"resultset": "second"}';
    let last = '{"resultset": "last"}';
    sandbox.stub(requestify, 'get', (url, option) => {
      if (url === '') {
        return Promise.resolve({code: 200, body: '{"startAt": 0,"total": 12,"maxResults": 5,"issues": [' + first + ']}'});
      } else if (url === '&startAt=5') {
        return Promise.resolve({code: 200, body: '{"startAt": 5,"total": 12,"maxResults": 5,"issues": [' + second + ']}'});
      } else {
        return Promise.resolve({code: 200, body: '{"startAt": 10,"total": 12,"maxResults": 5,"issues": [' + last + ']}'});
      }
    });
    return expect(jira.execJiraQuery('', true)).to.eventually.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('startAt', 0);
        expect(response).to.have.property('total', 12);
        expect(response).to.have.property('maxResults', 12);
        expect(response).to.have.property('issues');
        expect(response.issues).to.be.an('array');
        expect(response.issues).to.have.length(3);
        expect(response.issues[0]).to.have.property('resultset', 'first');
        expect(response.issues[1]).to.have.property('resultset', 'second');
        expect(response.issues[2]).to.have.property('resultset', 'last');
      });
  });
  it('execJiraQuery doesn\'t aggregate results if retrieveAllPages = false', () => {
    let first = '{"resultset": "first"}';
    let second = '{"resultset": "second"}';
    let last = '{"resultset": "last"}';
    sandbox.stub(requestify, 'get', (url, option) => {
      if (url === '') {
        return Promise.resolve({code: 200, body: '{"startAt": 0,"total": 12,"maxResults": 5,"issues": [' + first + ']}'});
      } else if (url === '&startAt=5') {
        return Promise.resolve({code: 200, body: '{"startAt": 5,"total": 12,"maxResults": 5,"issues": [' + second + ']}'});
      } else {
        return Promise.resolve({code: 200, body: '{"startAt": 10,"total": 12,"maxResults": 5,"issues": [' + last + ']}'});
      }
    });
    return expect(jira.execJiraQuery('', false)).to.eventually.be.fulfilled
      .then((response) => {
        expect(response).to.have.property('startAt', 0);
        expect(response).to.have.property('total', 12);
        expect(response).to.have.property('maxResults', 5);
        expect(response).to.have.property('issues');
        expect(response.issues).to.be.an('array');
        expect(response.issues).to.have.length(1);
        expect(response.issues[0]).to.have.property('resultset', 'first');
      });
  });
  it('execJiraQuery is rejected if failure occus during aggregation', () => {
    let first = '{"resultset": "first"}';
    sandbox.stub(requestify, 'get', (url, option) => {
      if (url === '') {
        return Promise.resolve({code: 200, body: '{"startAt": 0,"total": 8,"maxResults": 5,"issues": [' + first + ']}'});
      } else if (url === '&startAt=5') {
        return Promise.resolve({code: 400, body: 'Failed!'});
      }
    });
    return expect(jira.execJiraQuery('', true)).to.eventually.be.rejected;
  });
});
