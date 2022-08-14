
var {
  events,
  path
} = require("./nodeDeps.js");


module.exports = function (context) {

  var fetch = context._fetch;

  function Package(registry, packageLocation, type) {
    this.registry = registry;
    this.type = type || "path";// 'path'/url  or tarball,  ** want to make this detectable
    this.basepath = packageLocation;//leads to direct path where '/package.json' is or '/package.tar.gz' is   
    this.context = context;
    this.loaded = false;
    this._meta = {};
  }

  
  Package.prototype = new events.EventEmitter();

  Package.create = function(){
    var o = Object.create(Package.prototype,{
      constructor:{
        value:Package
      }
    });
    return o;
  };

  Package.prototype.load = async function(){
    var context = this.context;
    var $url = context._urlify(this.basepath);
    var packageData, err;
    if(this.type == "path"){        
        packageData = await fetch($url.href + "package.json");
        if(packageData){
          packageData = JSON.parse(packageData);
        }
    }    

    if(!packageData) err = this.location + "  'package.json' data not exist";
    else this._meta = packageData;

    this.version = this._meta.version;
    this.name = this._meta.name;

    this.main = this._meta.main || this._meta.module;
    if(this.main)
      this.main = path.normalize(this.main);
    
    if(this._meta.dependencies)
      this.dependencies = JSON.parse(JSON.stringify(this._meta.dependencies));

    this.react = this._meta.react;
    
    if(!err){ 
      this.loaded = true;
      return this;
    }else
      throw new Error(err);
  };

  
  Package.prototype.readFile = async function(filePath){
    var err, $fileData;
    if(this.type == "path"){        
        $fileData = await fetch(this.basepath + filePath);
        if($fileData){
          return $fileData;
        }
    }    

    if(!$fileData) err = this.location + "  'package.json' data not exist";

    if(!err) return this;
    throw new Error(err);
  };

  Package.prototype.fileExist = async function(filePath){
    var $fileData;
    if(this.type == "path"){        
        $fileData = await fetch(this.basepath + filePath);
        if($fileData){
          return true;
        }
    }    
    return false;
  };
  

  return Package;
};