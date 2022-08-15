var {
  events,
  path,
  tar,
  zlib,
  crypto
} = require("./nodeDeps.js");
var Tarball = tar.Tarball;

module.exports = function (context) {

  var fetch = context._fetch;

  function Package(registry, packageLocation, type, integrity, basePath) {
    this.registry = registry;
    this.type = type || "path"; // 'path'/url  or tarball,  ** want to make this detectable
    this.basepath = packageLocation; //leads to direct path where '/package.json' is or '/package.tar.gz' is   
    this.context = context;
    this.tarball_basePath = basePath || "package";
    this.integrity = integrity;
    this.loaded = false;
    this._meta = {};
  }


  Package.prototype = new events.EventEmitter();

  Package.create = function () {
    var o = Object.create(Package.prototype, {
      constructor: {
        value: Package
      }
    });
    return o;
  };

  Package.prototype.load = async function () {
    var context = this.context;
    var $url = context._urlify(this.basepath);
    var packageData, err;

    switch (this.type) {
      case 'path':
        packageData = await fetch($url.href + "package.json");
        if (packageData) {
          packageData = JSON.parse(packageData);
        }
        break;
      case 'tarball':
        var tarball_zipped = new Uint8Array(await fetch($url.href, 'buffer'));
        var hash = crypto.createHash('sha512').update(tarball_zipped).digest('base64');
        var hashCheck = ("sha512-" + hash == this.integrity);
        if (hashCheck) {

          this.tarball = await (new Promise((resolve) => {
            zlib.gunzip(tarball_zipped, (err, tarball) => {
              resolve(Tarball.extract(tarball));
            });
          }));

        }

        if (this.tarball) {
          this.files = this.processTarball(this.tarball);
          packageData = await this.readFile("package.json");
          if (packageData) {
            packageData = JSON.parse(packageData);
          }
        }
        break;

      default:
        break;
    }

    if (!packageData) err = this.location + "  'package.json' data not exist";
    else this._meta = packageData;

    this.version = this._meta.version;
    this.name = this._meta.name;

    this.main = (typeof this._meta.browser == "string" ? this._meta.browser : false) || this._meta.main || this._meta.module;
    if (this.main)
      this.main = path.normalize(this.main);

    if (this._meta.dependencies)
      this.dependencies = JSON.parse(JSON.stringify(this._meta.dependencies));

    this.react = this._meta.react;

    if (!err) {
      this.loaded = true;
      return this;
    } else
      throw new Error(err);
  };

  Package.prototype.processTarball = function processTarball(extractedTarball) {
    var out = {};
    var tarFile;
    for (var j in extractedTarball) {
      tarFile = extractedTarball[j];
      if(tarFile.content)
        out[tarFile.fileName] = tarFile.content.toString("utf8");
    }
    return out;
  };

  Package.prototype.readFile = async function (filePath) {
    var err, $fileData;

    switch (this.type) {
      case 'path':
        $fileData = await fetch(this.basepath + filePath);
        if ($fileData) {
          return $fileData;
        }
        break;
      case 'tarball':
        if (this.files[this.tarball_basePath + "/" + filePath])
          return this.files[this.tarball_basePath + "/" + filePath];
        break;

      default:
        break;
    }
    if (!$fileData) err = this.location + "  'package.json' data not exist";

    if (!err) return this;
    throw new Error(err);
  };

  Package.prototype.fileExist = async function (filePath) {
    var $fileData;
    switch (this.type) {
      case 'path':
        $fileData = await fetch(this.basepath + filePath);
        if ($fileData) {
          return true;
        }
        break;
      case 'tarball':
        if (this.files[this.tarball_basePath + "/" + filePath])
          return true;
        break;

      default:
        break;
    }
    return false;
  };


  return Package;
};