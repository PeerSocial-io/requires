var {
  path
} = require("../nodeDeps.js");

module.exports = function (Registry) {

  var Package = Registry.Package;

  // unpkg.com/:package@:version/:file
  var baseURL = "https://unpkg.com/";

  function RegistryClass() {
    this.name = "unpkg";
    this.constructor.call(this);
    // this.setDefault();
  }

  RegistryClass.prototype = Registry.create();


  RegistryClass.prototype.packageExist = async function (basePath, packageName, packageVersion) {
    var context = this.context;
    basePath = basePath || this.context.basePath;

    var packageJSON;
    if(packageName){
      var possiblePaths = this.buildPossiblePaths(basePath);
      for (var i in possiblePaths) {
        packageJSON = await context._fetch(possiblePaths[i] + packageName + "/package.json");
        try {
          packageJSON = JSON.parse(packageJSON);
        } catch (e) {
          packageJSON = false;
        }
        if (!packageJSON) continue;
        else {
          if(!packageJSON.name == packageName) continue;
          if (packageVersion && !(packageJSON.name == packageVersion)) continue;
          return possiblePaths[i] + packageName + "/package.json";
        }
      }
    }else{
      packageJSON = await context._fetch(basePath + "package.json");
      try {
        packageJSON = JSON.parse(packageJSON);
      } catch (e) {
        packageJSON = false;
      }
      if(packageJSON)  
          return basePath + "package.json";
    }
    return false;

    // throw new Error("Not Implimented");
  };

  var __PACKAGES = {};

  RegistryClass.prototype.getPackage = async function (basePath, packageName, packageVersion) {
    var registry = this;
    var context = this.context;

    basePath = basePath || this.context.basePath;

    var packagePath = await this.packageExist(basePath, packageName, packageVersion);

    if (__PACKAGES[packagePath])
      return __PACKAGES[packagePath];

    __PACKAGES[packagePath] = new PackageClass(registry, packagePath, "path");

    return __PACKAGES[packagePath];

  };

  RegistryClass.prototype.buildPossiblePaths = function __buildPossiblePaths(basePath) {
    var context = this.context;
    basePath = basePath || this.context.basePath;

    basePath = context._urlify(basePath);
    var bp = basePath.href; //basePath
    var $paths = [];
    $paths.push(bp); //add basePath
    $paths.push(basePath.href + "node_modules/"); // bp+ ./node_modules/
    while (((basePath.pathname = "../") && basePath.pathname !== "/")) { //step down a folder
      $paths.push(basePath.href + "node_modules/"); //bp+ ./node_modules/
    }
    $paths.push(basePath.href + "node_modules/"); //add root /node_modules/

    return $paths;
  };


  function PackageClass(...args) {
    this.constructor.apply(this, args);
  }

  PackageClass.prototype = Package.create();



  Registry.define(new RegistryClass());
};
