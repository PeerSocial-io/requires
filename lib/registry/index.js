
var {
  events
} = require("../nodeDeps.js");


module.exports = function (context){    

  var Package = require("../package.js")(context);

  function _Registry() { 
    this.constructor.call(this);
    this.context = context;
    this.Package = Package;
    this.__PACKAGES = {};
  }

  _Registry.prototype = Object.create(events.EventEmitter.prototype,{
    constructor:{
      value:events.EventEmitter
    }
  });

  _Registry.prototype.create = function(){
    var o = Object.create(Registry.prototype,{
      constructor:{
        value:Registry
      }
    });
    return o;
  };

  _Registry.prototype._defined = {};
  _Registry.prototype._default = null;

  _Registry.prototype.setDefault = function(val){
    $registry._default = val || this.name;
  };

  // Object.defineProperty(_Registry.prototype, "default", { get() { return _Registry.prototype._default; }, set(val) { _Registry.prototype._default = val; },  });

  _Registry.prototype.define = function(name, registry){
    if(!registry && typeof name == "object"){
      registry = name;
      name = registry.name;
    }
    this._defined[name] = registry;
  };

  _Registry.prototype.get = function(name){
    if(!name) name = this._default;
    return this._defined[name];
  };
 

  function Registry() { 
    this;
  }
  var $registry = Registry.prototype = new _Registry();

  Registry.prototype.packageExist = async function (/*packageName, packageVersion*/) {
    throw new Error("Not Implimented");
  };

  Registry.prototype.getPackage = async function (/*packageName, packageVersion*/) {
    throw new Error("Not Implimented");
  };

  require("./node_modules.js")($registry);
  require("./npm.js")($registry);
  require("./unpkg.js")($registry);
  // require("./github.js")($registry);

  return $registry;
};