var requires = (typeof window !== "undefined" ? window.requires() : require("./index.js")());

(async function (require) {
  var assert = require("assert");

  var configured_packages = {};
  require.debug = true;

  require.home("./test_app");
  // require.registry.setDefault("node_modules");

  configured_packages.gun = await require.install("gun");
  assert.equal(typeof configured_packages.gun.version == "undefined", false, "gun should Have a version");

  // configured_packages.phaser = await require.install("phaser");
  // configured_packages.proton = await require.install("proton-engine");
  // configured_packages.proton_src = await require(["proton-engine/src/index.js"]);
  // configured_packages.provable = await require.install("provable");
  
  configured_packages.bnjs = await require.install("bn.js");
  assert.equal(typeof configured_packages.bnjs.BN == "undefined", false, "bnjs should Have a BN in object");

  configured_packages.elliptic = await require.install("elliptic");  
  assert.equal(typeof configured_packages.elliptic.version == "undefined", false, "elliptic should Have a version");

  configured_packages.pako = await require.install("pako");
  assert.equal(typeof configured_packages.pako.ungzip == "undefined", false, "pako should Have a ungzip in object");

  // configured_packages.forge = await require.install("node-forge");


  configured_packages.app = await require.install("./");
  
  assert.equal(typeof configured_packages.app == "object", true, "App should be a Object");
  assert.equal(configured_packages.app.hello, 'world', "app.hello should equal 'world'");

  console.log("configured_packages", configured_packages);
  if (typeof module !== "undefined")
    module.exports = configured_packages;

})(requires);