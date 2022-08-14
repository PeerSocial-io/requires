module.exports = function (Registry) {

  var RegistryName = "github";

  function RegistryClass() {
    this.constructor.call(this);
    this.context = Registry.context;
  }

  RegistryClass.prototype = Registry.create();

  
  RegistryClass.prototype.packageExist = async function (/*packageName, packageVersion*/) {
    throw new Error("Not Implimented");
  };

  RegistryClass.prototype.getPackage = async function (/*packageName, packageVersion*/) {
    throw new Error("Not Implimented");
  };


  Registry.define(RegistryName, new RegistryClass());
};
