var requires = (typeof window !== "undefined" ? window.requires() : require("./index.js")());

(async function (require) {

  var configured_packages = {};
  require.debug = true;

  require.home("./test_app");
  // require.registry.setDefault("node_modules");

  configured_packages.gun = await require.install("gun");
  // configured_packages.phaser = await require.install("phaser");
  // configured_packages.proton = await require.install("proton-engine");
  // configured_packages.proton_src = await require(["proton-engine/src/index.js"]);
  configured_packages.provable = await require.install("provable");
  configured_packages.bnjs = await require.install("bn.js");
  configured_packages.elliptic = await require.install("elliptic");
  configured_packages.pako = await require.install("pako");
  configured_packages.forge = await require.install("node-forge");


  configured_packages.app = await require.install("./");

  console.log("configured_packages", configured_packages);
  if (typeof module !== "undefined")
    module.exports = configured_packages;

})(requires);