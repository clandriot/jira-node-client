module.exports = {
  /**
   * User configurable property, sets the number of retries to do when an api returns a server error
   * @param {Number}
   * @default
   */
  maxRetry: 5,
  /**
   * User configurable property, sets the time to wait (in milliseconds) between 2 retries when an api returns a server error
   * @param {Number}
   * @default
   */
  retryTimeout: 1000,
};
