(async function (require) {

  // require.home("./");
  // require.provider("./app/node_modules/");
  require.provider("https://unpkg.com/");

  var configured_packages = {};

  await require.install("pako@2.0.4");

  var crypto = configured_packages.crypto = require("crypto");
  var zlib = configured_packages.zlib = require("zlib");
  var tar = configured_packages.tar = require("tar");
  var fetch = configured_packages.fetch = require("fetch");


  var Tarball = tar.Tarball;

  var nodeForge_registry = JSON.parse(await fetch("https://registry.npmjs.org/node-forge/"));
  var nodeForge_version = nodeForge_registry['dist-tags'].latest;
  var nodeForge_version_package = nodeForge_registry.versions[nodeForge_version];

  var tarball_zipped = new Uint8Array(await fetch(nodeForge_version_package.dist.tarball, 'buffer'));
  var hash = crypto.createHash('sha512').update(tarball_zipped).digest('base64');
  var hashCheck = ("sha512-" + hash == nodeForge_version_package.dist.integrity);
  if (hashCheck) {
    zlib.gunzip(tarball_zipped,(err,tarball)=>{

      var entriesFromBigFile = Tarball.extract(tarball);

      console.log(entriesFromBigFile);
    });
  }
  console.log("configured_packages", configured_packages);
})(require("./lib/requires.js")());