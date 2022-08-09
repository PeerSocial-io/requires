(async function (require) {

  // require.home("./");
  // require.provider("./app/node_modules/");
  require.provider("https://unpkg.com/");

  
  var configured_packages = await require.install("./app");

  // await require.install("bn.js");
  // await require.install("elliptic");
  

  // console.log("packages installed");

  // configured_packages.crypto = require("crypto");
  // console.log("crypto", configured_packages.crypto);

  // configured_packages.app = require("app");
  // console.log("app", configured_packages.app);

  // configured_packages.bnjs = require("bn.js");
  // console.log("bnjs", configured_packages.bnjs);

  // configured_packages.elliptic = require("elliptic");
  // console.log("elliptic", configured_packages.elliptic);

  // configured_packages.buffer = require("buffer");
  // console.log("buffer", configured_packages.buffer);

  // configured_packages.webcrypto = require("@peculiar/webcrypto");
  // console.log("webcrypto", configured_packages.webcrypto);

  // configured_packages.forge = require("node-forge");
  // console.log("forge", configured_packages.forge);

  // var app = require("app/main");

  // var elliptic = (await require(["elliptic"], function(elliptic){

  // }))[0];
  
  
  console.log("configured_packages",configured_packages);
})(require("./lib/requires.js"));