
var Module = require("./module");

var semver = require("semver");//yay

var {
  events,
  // path,
  // url
} = require("./nodeDeps.js");

function Dependency(context, depName, depVersion, registryName) {
  this.context = context;
  this.modules = {};
  this.loaded = false;
  this.dependencies = {}; // holds the list of dependencies by version

  this._dependencies = {}; //holds the version pointer

  this.registry = context.registry.get(registryName);
  this.main = false;

  if (context.id == depName) {
    depVersion = depVersion || "0.0.0";
    this.loaded = true;
    this.dependencies = context.dependencies;
    this.packagePath = depName;
    this.package = {
      name: depName,
      version: depVersion,
      dependencies: context._dependencies
    };
  }

  this.name = depName || false;
  this.version = depVersion || false;
}

Dependency.prototype = new events.EventEmitter();

Dependency.prototype.setPackagePath = function setPackagePath(customPath) {
  var packagePath = "";

  if (customPath) {
    packagePath = customPath;
  } else if (this.name) {
    packagePath = this.name;
  }

  if (!packagePath) {
    this.path = false;
    return this.path;
  }

  if (packagePath && packagePath.substr(-1) != "/")
    packagePath = packagePath + "/";
  this.path = packagePath;
  return packagePath;
};

Dependency.prototype.setRegistry = function setPackage(registryName) {
  var dependency = this;
  var context = dependency.context;
  this.registry = context.registry.get(registryName);
};

Dependency.prototype.load = function load(callerModule) {
  var callback = callerModule instanceof Module ? false : callerModule;
  if (callback) callerModule = false;
  var dependency = this; // var context = dependency.context;

  var promise = new Promise(async function dependencyLoad(resolve) {
    if (dependency.loaded) return resolve(dependency);
    await dependency.loadPackage();
    dependency.loaded = true;
    var deps;

    if ((deps = dependency.package.dependencies)) {
      for (var i in deps) await dependency.addDependency(i, deps[i]);
    }

    if (dependency.main) {
      var mainModule = (dependency.modules["main"] = new Module(
        dependency,
        dependency.main
      ));
      await mainModule.load(callerModule || mainModule);
    }

    if (callback) callback(dependency);
    resolve(dependency);
  });
  return promise;
};

Dependency.prototype.loadPackage = function loadPackage(parrentPackage) {
  var dependency = this;
  // this.registry =(parrentPackage && parrentPackage.registry) || this.registry;
  var registry = this.registry;
  var context = dependency.context;
  return new Promise(async function dependencyLoad(resolve) {
    if (dependency.package) return resolve(dependency);
    var registry_package = await registry.getPackage(
      dependency.path ||
      (parrentPackage && parrentPackage.path) ||
      context.basePath,
      dependency.name,
      dependency.version
    );
    if (!registry_package)
      throw new Error("Package Failed to load");
    if (!registry_package.loaded) await registry_package.load();
    if (
      dependency.name != registry_package.name &&
      !(dependency.name === false)
    )
      throw new Error("module name missmatch");
    if (dependency.name === false) dependency.name = registry_package.name;
    if (dependency.version === false)
      dependency.version = registry_package.version;
    dependency._version = dependency.version;

    if (registry_package.version !== dependency.version) {
      // console.warn(dependency.name, "version mismatch", dependency._version, dependency.version);
      if (semver.satisfies(registry_package.version, dependency.version)) {
        dependency.version = registry_package.version;
      } else throw new Error("Version Mismatch loading package");
    }

    dependency.main = registry_package.main;
    dependency.package = registry_package;
    dependency.path = registry_package.basepath;
    resolve(dependency);
  });
};

Dependency.prototype.loadModule = function loadModule(
  modulePath,
  callerModule,
  callback
) {
  var dependency = this;
  if (!modulePath) modulePath = dependency.main || "index.js";
  if (dependency.modules[modulePath]) return dependency.modules[modulePath];
  var promise = new Promise(async function loadModulePromise(resolve) {
    if (!dependency.loaded) await dependency.load(callerModule);
    var $modulePath = modulePath || dependency.main || "index.js";
    var mod = dependency.modules[$modulePath];

    if (!mod) {
      var module = new Module(dependency, $modulePath, callerModule);
      mod = await module.load(callerModule);
    }

    resolve(mod);
  });
  promise.then(callback);
  return promise;
};

Dependency._cached = {};

Dependency.prototype.addDependency = function addDependency(
  dependencyName,
  dependencyVersion
) {
  var parentDependency = this;
  var context = this.context;
  var contextDependency = context.dependency;
  var promise = new Promise(async (resolve) => {
    var dependency = new Dependency(
      context,
      dependencyName,
      dependencyVersion
    );
    await dependency.loadPackage(parentDependency);

    if (Dependency._cached[dependency.name + "@" + dependency.version]) {
      dependency =
        Dependency._cached[dependency.name + "@" + dependency.version];
    } else {
      Dependency._cached[dependency.name + "@" + dependency.version] =
        dependency;
      if (
        !contextDependency.hasDependency(dependency.name, dependency.version)
      )
        dependency.attachTo(contextDependency);
    }

    dependency.attachTo(parentDependency);
    resolve(dependency);
  });
  return promise;
};

Dependency.prototype.attachTo = function (parentDep) {
  var dependency = this;
  var context = this;
  if (parentDep.name != dependency.context.id)
    if (context.debug) console.info(
      "Attached Dependency",
      dependency.registry.name +
      ":" +
      dependency.name +
      "@" +
      dependency.version,
      "for",
      parentDep.registry.name + ":" + parentDep.name + "@" + parentDep.version
    );
  if (!parentDep.dependencies[dependency.name])
    parentDep.dependencies[dependency.name] = {};
  parentDep.dependencies[dependency.name][dependency.version] = dependency;
  parentDep._dependencies[dependency.name] = dependency.version;
};

Dependency.prototype.hasDependency = function (
  dependencyName,
  dependencyVersion
) {
  var $dependency = this;
  var context = this.context;
  var dep = context.parseModulePath(dependencyName);

  if (!dependencyVersion) {
    if (
      (dependencyVersion = $dependency._dependencies[dep.name]) &&
      $dependency.dependencies[dep.name][dependencyVersion]
    ) {
      return true;
    }
  } else {
    if (
      $dependency.dependencies[dep.name] &&
      $dependency.dependencies[dep.name][dependencyVersion]
    ) {
      return true;
    }
  }

  return false;
};

Dependency.prototype.getDependency = function getDependency(
  dependencyName,
  dependencyVersion
) {
  var $dependency = this;
  var context = this.context;
  var dep = context.parseModulePath(dependencyName);
  var dependency;

  if (!dependencyVersion) {
    if (
      (dependencyVersion = $dependency._dependencies[dep.name]) &&
      $dependency.dependencies[dep.name][dependencyVersion]
    ) {
      dependency = $dependency.dependencies[dep.name][dependencyVersion];
    }
  } else {
    if (
      $dependency.dependencies[dep.name] &&
      $dependency.dependencies[dep.name][dependencyVersion]
    ) {
      dependency = $dependency.dependencies[dep.name][dependencyVersion];
    }
  }

  switch (true) {
    default:
      if (!dependency) {
        if (context.dependency.dependencies[dep.name]) {
          if (dependencyVersion) {
            if (
              context.dependency.dependencies[dep.name][dependencyVersion]
            ) {
              dependency =
                context.dependency.dependencies[dep.name][dependencyVersion];
              break;
            }
          } else
            dependencyVersion = context.dependency._dependencies[dep.name];

          dependency =
            context.dependencies[dep.name][dependencyVersion || "0.0.0"];
        }
      }

      break;
  }

  var defDep;

  if (dependency) {
    defDep = dependency;
  } else if (dep.name !== context.id) {
    defDep = $dependency.getDependency(context.id);
  }

  if (defDep) {
    return defDep;
  }

  throw "no dependcy found";
};


module.exports = Dependency;