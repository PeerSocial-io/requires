var requires = (typeof window !== "undefined" ? window.requires() : require("./index.js")());

(async function (require) {

  var configured_packages = {};
  require.debug = true;

  require.home("./test_app");

  configured_packages.app = await require.install("./");


  configured_packages.elliptic = await require.install("elliptic");
  configured_packages.pako = await require.install("pako");
  configured_packages.forge = await require.install("node-forge");


  // console.log("configured_packages", configured_packages);
  if (typeof module !== "undefined")
    module.exports = configured_packages;

})(requires);