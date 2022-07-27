//your basic commonjs module
(function () {
  define(function (require, exports, module) {
    var hello = require("./hello.js")

    module.exports = hello;
  });
})();
