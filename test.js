

var isBrowser = !(typeof window == "undefined") ? true : false;


var requires = (isBrowser && window.requires ? window.requires() : require("./requires.js")());

(async function (require) {
  var assert = require("assert");

  var configured_packages = {};
  // require.debug = true;

  if(isBrowser)
    require.home("../test_app");
  else  
    require.home("./test_app");
  
    // require.registry.setDefault("node_modules");

  configured_packages.gun = await require.install("gun");
  assert.equal(typeof configured_packages.gun.version == "undefined", false, "gun should Have a version");
  
  configured_packages.provable = await require.install("unpkg:provable");
  var engine = configured_packages.provable({
    count:10000, //default:1, number of hashes in the series to produce, takes longer depending on how big the number is
    seed:'optional seed to start your series with' //defaults to some random string with letters and numbers
  });
  var int32 = engine();//return a random int32 and increments the internal state to the next hash
  assert.equal(3274417075, int32, "provable math failed");
  
  configured_packages.bnjs = await require.install("bn.js");
  assert.equal(typeof configured_packages.bnjs.BN == "undefined", false, "bnjs should Have a BN in object");

  configured_packages.elliptic = await require.install("elliptic");  
  assert.equal(typeof configured_packages.elliptic.version == "undefined", false, "elliptic should Have a version");

  configured_packages.pako = await require.install("pako");
  assert.equal(typeof configured_packages.pako.ungzip == "undefined", false, "pako should Have a ungzip in object");

  configured_packages.forge = await require.install("node-forge");


  configured_packages.app = await require.install("./");
  
  assert.equal(typeof configured_packages.app == "object", true, "App should be a Object");
  assert.equal(configured_packages.app.hello, 'world', "app.hello should equal 'world'");

  console.log("configured_packages", configured_packages);
  if (typeof module !== "undefined")
    module.exports = configured_packages;

})(requires);