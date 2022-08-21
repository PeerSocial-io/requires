
var semver = require("semver");

module.exports = function (Registry) {

  var Package = Registry.Package;

  // unpkg.com/:package@:version/:file
  var baseURL = "https://unpkg.com/";

  function RegistryClass() {
    this.name = "unpkg";
    this.constructor.call(this);
  }

  RegistryClass.prototype = Registry.create();


  RegistryClass.prototype.packageExist = async function (basePath, packageName, packageVersion) {
    var context = this.context;
    basePath = basePath || this.context.basePath;
    var packageLocation = baseURL + packageName + (packageVersion ? "@" + packageVersion : "") + "/";
    return new Promise((resolve)=>{
      context._fetch(packageLocation + "package.json", function(packageJSON, packageJSON_URL){
        var packageJSON_URL_basePath = context._urlify(packageJSON_URL);
        packageJSON_URL_basePath.pathname = "./";
        packageJSON_URL_basePath = packageJSON_URL_basePath.href;

          try {
            packageJSON = JSON.parse(packageJSON);
          } catch (e) {
            packageJSON = false;
          }
          if (!packageJSON) 
          return false;
          else {
            if(!packageJSON.name == packageName) return resolve(false);
            if (packageVersion && !semver.satisfies(packageJSON.version, packageVersion)) return resolve(false);
            return resolve(packageJSON_URL_basePath);
          }
        });
      });
    
  };

  RegistryClass.prototype.getPackage = async function (basePath, packageName, packageVersion) {
    var registry = this;
    // var context = this.context;

    basePath = basePath || this.context.basePath;

    var packagePath = await this.packageExist(basePath, packageName, packageVersion);
    
    if(!packagePath) return false;
    
    if (Registry.__PACKAGES[packagePath])
      return Registry.__PACKAGES[packagePath];

      Registry.__PACKAGES[packagePath] = new PackageClass(registry, packagePath, "path");

    return Registry.__PACKAGES[packagePath];

  };

  function PackageClass(...args) {
    this.constructor.apply(this, args);
  }

  PackageClass.prototype = Package.create();



  Registry.define(new RegistryClass());
};
