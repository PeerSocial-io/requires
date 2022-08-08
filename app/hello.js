
//your old basic nodejs module

var configured_packages = require("./nest/helloVal.js")

// throw new Error("darn")

    // configured_packages.bnjs = require("bn.js");
    // console.log("bnjs", configured_packages.bnjs);

    configured_packages.elliptic = require("elliptic");
    console.log("elliptic", configured_packages.elliptic);

    // configured_packages.buffer = require("buffer");
    // console.log("buffer", configured_packages.buffer);

    // configured_packages.webcrypto = require("@peculiar/webcrypto");
    // console.log("webcrypto", configured_packages.webcrypto);

    // configured_packages.forge = require("node-forge");
    // console.log("forge", configured_packages.forge);

module.exports = configured_packages;