const test = require('unit.js');
const testThat = test.promise;
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
const rewire = require('rewire');
const cookie = rewire('../lib/cookieAuthentication.js');
const requestify = require('requestify');
const getBaseUrl = cookie.__get__('getBaseUrl');
const extract = cookie.__get__('extractSessionCookie');

before(() => chai.use(chaiAsPromised));

beforeEach(() => sandbox = sinon.sandbox.create());

afterEach(() => sandbox.restore());


describe('getBaseUrl', () => {
  it('getBaseUrl() returns base url if valid url', () => testThat
    .given(() => 'http://www.dummyserver:23456/rest/api/2/issue/ID-5')
    .when((url) => getBaseUrl(url))
    .then((baseUrl) => expect(baseUrl).to.equal('http://www.dummyserver:23456/rest/'))
  );
  it('getBaseUrl() throw error if missing url', () => testThat
    .given()
    .when(() => () => getBaseUrl())
    .then((func) => expect(func).to.throw(Error))
  );
  it('getBaseUrl() throw error if invalid url', () => testThat
      .given(() => 'http://www.dummyserver:23456/bla/bla/bla')
      .when((url) => () => getBaseUrl(url))
      .then((func) => expect(func).to.throw(Error))
  );

  describe('extractSessionCookie', () => {
    it('extractSessionCookie() throw error if cookie name not specified', () => testThat
      .given(() => 'fake="KHG8768"')
      .when((cookie) => () => extract(cookie))
      .then((func) => expect(func).to.throw(Error))
    );
    it('extractSessionCookie() throw error if cookies not specified', () => testThat
      .given()
      .when(() => () => extract())
      .then((func) => expect(func).to.throw(Error))
    );
    it('extractSessionCookie() throw error if cookies is not an array', () => testThat
      .given(() => ({cookies: 'fake="KHG987J"', name: 'fake'}))
      .then((data) => () => extract(data.cookies, data.name))
      .then((func) => expect(func).to.throw(Error))
    );
    it('extractSessionCookie() returns sessionCookie when only one cookie', () => testThat
      .given(() => ({cookies: ['cookie1="LKJHLKJ8768H"'], name: 'cookie1'}))
      .when((data) => extract(data.cookies, data.name))
      .then((cookie) => expect(cookie).to.equal('cookie1="LKJHLKJ8768H"'))
    );
    it('extractSessionCookie() throw error if cookie name not found in cookies', () => testThat
      .given(() => ({cookies: ['cookie1="LKJHLKJ8768H"'], name: 'cookie2'}))
      .when((data) => () => extract(data.cookies, data.name))
      .then((func) => expect(func).to.throw(Error))
    );
    it('extractSessionCookie() returns sessionCookie when multiple cookies', () => testThat
      .given(() => ({cookies: ['cookie1="LKJHLKJ8768H"', 'cookie2="KJHG76KHJB"', 'cookie3="JRS8MLKJKJF"', 'cookie4="JH8976HGFCJ"'], name: 'cookie3'}))
      .when((data) => extract(data.cookies, data.name))
      .then((cookie) => expect(cookie).to.equal('cookie3="JRS8MLKJKJF"'))
    );
    it('extractSessionCookie() returns sessionCookie when multiple cookies and empty cookie with cookie name ignored', () => testThat
      .given(() => ({cookies: ['cookie1="LKJHLKJ8768H"', 'cookie2="KJHG76KHJB"', 'cookie3=""', 'cookie3="JH8976HGFCJ"'], name: 'cookie3'}))
      .when((data) => extract(data.cookies, data.name))
      .then((cookie) => expect(cookie).to.equal('cookie3="JH8976HGFCJ"'))
    );
  });

  describe('getHeader', () => {
    it('getHeaders() builds header including cookie', () => testThat
      .given(() => 'cookiename=cookievalue')
      .when((sessionCookie) => cookie.getHeader(sessionCookie))
      .then((header) => {
        expect(header).to.have.property('cookie', 'cookiename=cookievalue');
        expect(header).to.have.property('Cache-Control', 'public, max-age=60');
      })
    );
  });

  describe('login', () => {
    it('login() rejects with if url not set', () => {
      return expect(cookie.login('user', 'password')).to.eventually.be.rejected
        .then((error) => {
          expect(error).to.be.an.instanceof(Error);
        });
    });
    it('login() rejects if no cookie is in header', () => {
      sandbox.stub(requestify, 'post', (url, body, option) => {
        let headers = {'set-cookie': ''};
        let response = '{"session": {"name": "studio.crowd.tokenkey"}}';
        return Promise.resolve({code: 200, headers: headers, body: response});
      });
      expect(cookie.login('dummy-user', 'dummy-password', 'http://www.dummyurl/rest/api/2/issue/ID-78')).to.eventually.be.fulfilled;
    });
    it('login() returns session Cookie', () => {
      sandbox.stub(requestify, 'post', (url, body, option) => {
        let headers = {'set-cookie': ['atlassian.xsrf.token=BGJJ-I70H-EYI8-6QPB|2ae8e3125acff97369f184a4530b59f9d983c12d|lout; Path=/; Secure', 'JSESSIONID=913F47DAFCA6D7FF09A65537D5BD3C5C; Path=/; Secure; HttpOnly', 'studio.crowd.tokenkey=""; Domain=.ulyssjira2.atlassian.net; Expires=Thu, 01-Jan-1970 00:00:10 GMT; Path=/; Secure; HttpOnly', 'studio.crowd.tokenkey=gW34EFQfK8Kbwpp6HkHmng00; Domain=.ulyssjira2.atlassian.net; Path=/; Secure; HttpOnly']};
        let response = '{"session": {"name": "studio.crowd.tokenkey"}, "loginInfo": {"failedLoginCount": 1, "loginCount": 230, "lastFailedLoginTime": "2017-01-17T10:20:43.467+0100", "previousLoginTime": "2017-01-17T17:11:46.798+0100"}}';
        return Promise.resolve({code: 200, headers: headers, body: response});
      });
      return expect(cookie.login('dummy-user', 'dummy-password', 'http://www.dummyurl/rest/api/2/issue/ID-78')).to.eventually.be.fulfilled
        .then((cookie) => {
          expect(cookie).to.equal('studio.crowd.tokenkey=gW34EFQfK8Kbwpp6HkHmng00');
        });
    });
  });
});
