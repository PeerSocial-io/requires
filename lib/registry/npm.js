module.exports = function (Registry) {

  var context = Registry.context;

  var crypto = require("crypto");
  var zlib = require("zlib");
  var tar = require("tar");
  var fetch = require("fetch");
  var Tarball = tar.Tarball;

  var RegistryName = "npm";

  var registry_basePath = "https://registry.npmjs.org/";

  function RegistryClass() {
    this.constructor.call(this);
    this.context = Registry.context;
  }

  RegistryClass.prototype = Registry.create();


  RegistryClass.prototype.packageExist = async function ( /*packageName, packageVersion*/ ) {
    throw new Error("Not Implimented");
  };

  RegistryClass.prototype.getPackage = async function ( /*packageName, packageVersion*/) {
    throw new Error("Not Implimented");
  };


  async function fetchMeta(packageName) {
    var nodeForge_registry = JSON.parse(await fetch("https://registry.npmjs.org/"+packageName+"/"));
    var nodeForge_version = nodeForge_registry['dist-tags'].latest;
    var nodeForge_version_package = nodeForge_registry.versions[nodeForge_version];

    var tarball_zipped = new Uint8Array(await fetch(nodeForge_version_package.dist.tarball, 'buffer'));
    var hash = crypto.createHash('sha512').update(tarball_zipped).digest('base64');
    var hashCheck = ("sha512-" + hash == nodeForge_version_package.dist.integrity);
    if (hashCheck) {
      zlib.gunzip(tarball_zipped, (err, tarball) => {

        var entriesFromBigFile = Tarball.extract(tarball);

        console.log(entriesFromBigFile);
      });
    }
  }



  Registry.define(RegistryName, new RegistryClass());
};
