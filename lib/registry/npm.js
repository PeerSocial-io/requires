var {
  path,
  tar,
  zlib,
  crypto
} = require("../nodeDeps.js");


var semver = require("semver");

module.exports = function (Registry) {

  var Package = Registry.Package;

  var baseURL = "https://registry.npmjs.org/";

  function RegistryClass() {
    this.name = "npmjs";
    this.constructor.call(this);
    // this.setDefault();
  }

  RegistryClass.prototype = Registry.create();


  RegistryClass.prototype.packageExist = async function (basePath, packageName, packageVersion) {
    var context = this.context;
    basePath = basePath || this.context.basePath;
    var packageLocation = baseURL + packageName + "/";

    var nodePackageRegistry = await context._fetch(packageLocation);
    if (nodePackageRegistry)
      try {
        nodePackageRegistry = JSON.parse(nodePackageRegistry);
      } catch (e) {
        nodePackageRegistry = false;
      }
    else
      return false;

    var nodePackageVersion = nodePackageRegistry['dist-tags'].latest;

    var satisfiedVersion = false;
    if (!packageVersion){
      satisfiedVersion = nodePackageVersion;
    }else if(semver.satisfies(nodePackageVersion, packageVersion)){
      satisfiedVersion = nodePackageVersion;
    }else{
      satisfiedVersion = nodePackageVersion;
    }

    var nodePackageMeta = nodePackageRegistry.versions[satisfiedVersion];
    if (satisfiedVersion)
      return nodePackageMeta.dist;
    else {
      return false;
    }
  };

  // Registry.__PACKAGES = {};

  RegistryClass.prototype.getPackage = async function (basePath, packageName, packageVersion) {
    var registry = this;
    var context = this.context;

    if(!basePath) throw new Error("basePath must be set for package in registry");

    var packageDist = await this.packageExist(basePath, packageName, packageVersion);

    if (!packageDist.tarball) return false;

    if (Registry.__PACKAGES[packageDist.tarball])
      return Registry.__PACKAGES[packageDist.tarball];

    Registry.__PACKAGES[packageDist.tarball] = new PackageClass(registry, packageDist.tarball, "tarball", packageDist.integrity);

    return Registry.__PACKAGES[packageDist.tarball];

  };

  function PackageClass(...args) {
    this.constructor.apply(this, args);
  }

  PackageClass.prototype = Package.create();

  // async function fetchMeta(packageName) {
  //   var nodeForge_registry = JSON.parse(await fetch("https://registry.npmjs.org/" + packageName + "/"));
  //   var nodeForge_version = nodeForge_registry['dist-tags'].latest;
  //   var nodeForge_version_package = nodeForge_registry.versions[nodeForge_version];

  //   var tarball_zipped = new Uint8Array(await fetch(nodeForge_version_package.dist.tarball, 'buffer'));
  //   var hash = crypto.createHash('sha512').update(tarball_zipped).digest('base64');
  //   var hashCheck = ("sha512-" + hash == nodeForge_version_package.dist.integrity);
  //   if (hashCheck) {
  //     zlib.gunzip(tarball_zipped, (err, tarball) => {

  //       var entriesFromBigFile = Tarball.extract(tarball);

  //       console.log(entriesFromBigFile);
  //     });
  //   }
  // }

  Registry.define(new RegistryClass());
};
