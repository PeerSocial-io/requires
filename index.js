(async function (require) {

  require.home("./app/package.json");
  require.provider("./node_modules/");
  // require.provider("https://unpkg.com/");

  var configured_packages = await require.install(function (dependencies) {

    // console.log("packages installed");
    var configured_packages = {};

    // configured_packages.crypto = require("crypto");
    // console.log("crypto", configured_packages.crypto);

    configured_packages.app = require("app");
    // console.log("app", configured_packages.app);

    configured_packages.bnjs = require("bn.js");
    // console.log("bnjs", configured_packages.bnjs);

    // configured_packages.elliptic = require("elliptic");
    // console.log("elliptic", configured_packages.elliptic);

    // configured_packages.buffer = require("buffer");
    // console.log("buffer", configured_packages.buffer);

    // configured_packages.webcrypto = require("@peculiar/webcrypto");
    // console.log("webcrypto", configured_packages.webcrypto);

    // configured_packages.forge = require("node-forge");
    // console.log("forge", configured_packages.forge);

    return configured_packages;
  });

  var app = await require(["elliptic"]);

})(require("./lib/requires.js"));