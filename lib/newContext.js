// const {
//   defaultOnError
// } = require("./operators.js");
var nodeDeps = require("./nodeDeps.js");

if (!process.platform && typeof navigator != "undefined")
  process.platform = navigator.platform.toLocaleLowerCase();

var {
  events,
  // crypto,
  path,
  // util,
  url // buffer
} = nodeDeps;

var semver = require("semver");

function isPromise(p) {
  if (p instanceof Promise) return true;
  if (typeof p === 'object' && p.toString() === '[object Promise]') return true;
  if (typeof p === 'object' && typeof p.then === 'function') return true;

  return false;
}

var $$transform = (() => {
  var babel = require("@babel/standalone");

  var psiosPreset = require("./babel-psio").default;

  babel.registerPlugin("psio", psiosPreset);

  function transform(contents, modulePath, react) {
    var ext = modulePath.split(".").pop();

    if (ext == "json") {
      contents =
        "module.exports = JSON.parse('" +
        JSON.stringify(JSON.parse(contents)) +
        "');";
    }

    if (!contents) {
      // throw "cant not transform nothing";
      contents = "module.exports = {};";
    }

    var $modulePath = url.parse(modulePath);
    var $modulePath_filename = path.basename($modulePath.pathname);
    var $modulePath_dirname = path.dirname($modulePath.pathname);

    function buildConfig(presets, plugins) {
      var config = {
        sourceMaps: "inline",
        sourceFileName: url.parse(modulePath).href,
        filename: $modulePath_filename,
        moduleId: url.parse(modulePath).href,
        moduleIds: true,
        moduleRoot: $modulePath_dirname // "targets": {
        // 	"esmodules": false
        // }
      };
      if (presets) config.presets = presets;
      if (plugins) config.plugins = plugins;
      return config;
    }

    var babelConfig;

    if (react) {
      babelConfig = buildConfig([babel.availablePresets["react"]]); //env transforms es6 to es5
      contents = babel.transform(contents, babelConfig).code;
    }

    babelConfig = buildConfig(); //basic transform, does a cleanup of code;
    contents = babel.transform(contents, babelConfig).code;

    babelConfig = buildConfig([babel.availablePresets["env"]]); //env transforms es6 to es5
    contents = babel.transform(contents, babelConfig).code;

    babelConfig = buildConfig(false, [babel.availablePlugins["psio"]]); //this wraps it into a transformed definition
    contents = babel.transform(contents, babelConfig).code; // console.log(modulePath, contents)

    return contents;
  }

  return transform;
})();

module.exports = function _Context($$fetch, $$exec, $$global) {

  function commentReplace(match, singlePrefix) {
    return singlePrefix || "";
  }

  var commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/gm,
    cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
    functionArgsNames = /(?<=\()(.*?)(?=\))/;
  // jsSuffixRegExp = /\.js$/,
  // jsExtRegExp = /^\/|:|\?|\.js$/;
  var Registry = require("./registry");

  function Dependency(context, depName, depVersion, registryName) {
    // console.warn("generating new dependency pointer", depName + "@" + depVersion);
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

    // if (!this.loaded && this.name) {
    //   this.setPackagePath();
    // }
  }

  Dependency.prototype = new events.EventEmitter();

  Dependency.prototype.setPackagePath = function setPackagePath(customPath) {
    // var dependency = this;
    var packagePath = "";

    if (customPath) {
      packagePath = customPath;
    } else if (this.name) {
      packagePath = this.name;
      // if (this.context.provider_config && this.context.provider_config.add_version && this.version)
      //   packagePath += "@" + this.version;
    }

    if (!packagePath) {
      this.path = false;
      // this.package_path = false;
      return this.path;
    }

    if (packagePath && packagePath.substr(-1) != "/")
      packagePath = packagePath + "/";
    this.path = packagePath;
    // this.package_path = this.path + "package.json";
    return packagePath;
  };

  
  Dependency.prototype.setPackage = function setPackage($package) {
    var dependency = this;
    if(dependency.package)
      return;
  
    if(typeof $package == "string"){
      //convert to PackageClass
    }else if(typeof $package == "object"){
      //is already a PackageClass
    }

    dependency.package = $package;

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
      dependency.loaded = true; // var $for = dependency.parentDep ? dependency.parentDep.name + "@" + dependency.parentDep.version : dependency.name + "@" + dependency.version;
      // var $self = packageJSON.name + "@" + packageJSON.version;
      // console.log("loading package-dependency", $for, $self)
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
    var registry = this.registry;
    var context = dependency.context;
    return new Promise(async function dependencyLoad(resolve) {
      if (dependency.package) return resolve(dependency);

      var registry_package = await registry.getPackage(dependency.path || (parrentPackage && parrentPackage.path) || context.basePath, dependency.name, dependency.version);

      if(!registry_package) 
        throw new Error("Package Failed to load");
      
      if(!registry_package.loaded)
        await registry_package.load();

      if (dependency.name != registry_package.name && !(dependency.name === false))
        throw "module name missmatch";
      if (dependency.name === false)
        dependency.name = registry_package.name;

      if (dependency.version === false)
        dependency.version = registry_package.version;

      dependency._version = dependency.version;

      if (registry_package.version !== dependency.version) {
        if (semver.satisfies(registry_package.version, dependency.version)) {
          dependency.version = registry_package.version; // console.warn(dependency.name, "version changed", dependency._version, dependency.version);
        } else {
          if (!path.basename(context.provider) == "node_modules") {
            //this should never happen.. as we requested this version.
            throw ""
              .concat(registry_package.name, "@")
              .concat(registry_package.version, " doesnt satisfy ")
              .concat(dependency.name, "@")
              .concat(dependency.version, "  ");
          }

          // if (parrentPackage) {
          //   dependency.setPackagePath(
          //     parrentPackage.path + "node_modules/" + dependency.name
          //   );
          //   return resolve(await dependency.loadPackage());
          // }
        }
      }

      dependency.main = registry_package.main;
      dependency.package = registry_package;

      resolve(dependency);
    });
  };

  Dependency.prototype.loadModule = function loadModule(
    modulePath,
    callerModule,
    callback
  ) {
    var dependency = this; // var context = this.context;

    if (!modulePath)
      modulePath = dependency.main  || "index.js";
    if (dependency.modules[modulePath]) return dependency.modules[modulePath];
    var promise = new Promise(async function loadModulePromise(resolve) {
      if (!dependency.loaded) 
        await dependency.load(callerModule);
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
        // console.warn("Re-Used Dependency", dependencyName + "@" + dependencyVersion, "for", parentDependency.name +"@"+parentDependency.version);
      } else {
        Dependency._cached[dependency.name + "@" + dependency.version] =
          dependency;
        if (
          !contextDependency.hasDependency(dependency.name, dependency.version)
        )
          dependency.attachTo(contextDependency);
        // console.warn("Installed Dependency", dependencyName + "@" + dependencyVersion, "for", parentDependency.name +"@"+parentDependency.version);
      }

      dependency.attachTo(parentDependency);
      resolve(dependency);
    });
    return promise;
  };

  Dependency.prototype.attachTo = function (parentDep) {
    var dependency = this; // dependency.parentDep = parentDep;
    if (parentDep.name != dependency.context.id)
      console.warn("Attached Dependency", dependency.name + "@" + dependency.version, "for", parentDep.name + "@" + parentDep.version);

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
    var dep = parseModulePath(dependencyName);

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
    var dep = parseModulePath(dependencyName);
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
    } // if (!dependency) {
    //   if ((dependencyVersion = $dependency._dependencies[dep.name]) && $dependency.dependencies[dep.name][dependencyVersion])
    //     dependency = $dependency.dependencies[dep.name][dependencyVersion];
    // }

    switch (true) {
      default:
        if (!dependency) {
          if (context.dependency.dependencies[dep.name]) {
            if (dependencyVersion) {
              if (context.dependency.dependencies[dep.name][dependencyVersion]) {
                dependency = context.dependency.dependencies[dep.name][dependencyVersion];
                break;
              }
            } else
              dependencyVersion = context.dependency._dependencies[dep.name];

            dependency = context.dependencies[dep.name][dependencyVersion || "0.0.0"];

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

  function Module(dependency, modulePath, callerModule) {
    modulePath = path.normalize(modulePath); // if (dependency.name !== dependency.context.id)
    //   console.log("created module", "'" + dependency.name + "@" + dependency.version + "/" + modulePath + "'");

    this.name = dependency.name;
    this.dependency = dependency;
    var context = this.context = dependency.context;
    this.path = modulePath;
    Object.defineProperty(this, "pathName", {
      get() {
        return this.name + "/" + this.path;
      }
    });
    Object.defineProperty(this, "modulePath", {
      get() {
        var $path = dependency.path;

        if (!$path) {
          return dependency.name + "/" + this.path;
        }

        if ($path && $path.substr(-1) != "/") $path = $path + "/";
        $path = context.parsePath($path);
        $path.pathname = $path.pathname + this.path;
        return $path.format();
      }
    });
    this.callers = [];
    if (callerModule) this.callers.push(callerModule);
    dependency.modules[modulePath] = this;
  }

  Module.prototype = new events.EventEmitter();

  Module.prototype.load = async function load() {
    var module = this;
    var dependency = module.dependency;
    var $package = module.dependency.package;

    async function loadFile(filePath){
      if(await $package.fileExist(filePath))
        return await $package.readFile(filePath);
      else return false;
    }

    return new Promise(async function moduleLoad(resolve) {
      // module.definition = await $$fetch(module.modulePath);
      module.definition = false;

      if (module.modulePath.substr(-1) == "/") {
        module.path = module.path + "index.js";
      }
      

      if (!dependency.needs_extention || module.modulePath.substr(-3) == ".js")
        module.definition = await loadFile(module.path);

      if (module.definition === false) {
        module.definition = await loadFile(module.path + ".js");

        if (!(module.definition === false)) {
          module.path = module.path + ".js";
          dependency.needs_extention = true;
        } else module.definition = false;
      }

      if (module.definition === false) {
        module.definition = await loadFile(module.path + "/index.js");

        if (!(module.definition === false)) {
          module.path = module.path + "/index.js";
        } else module.definition = false;
      }

      if (module.definition === false) {
        var e = ""
          .concat(module.name, " no definition @ ")
          .concat(module.modulePath, " ");
        console.error(e);
        throw new Error(e);
      }

      console.log(
        "loaded module",
        module.dependency.name +
        "@" +
        module.dependency.version +
        "/" +
        module.path
      );
      var useReact = (module.dependency.package && module.dependency.package.react);
      module.transform = $$transform(module.definition, module.modulePath, useReact ? true : false);
      $$exec(
        $$global,
        async function define(modulePath, deps, transformed_module) {
            if (modulePath != module.modulePath) throw "something bad happend"; //something bad happend

            if (!transformed_module && typeof deps == "function") {
              transformed_module = deps;
              deps = [];
            }

            module.transformed = transformed_module;
            module.dependencies = [].concat(
              deps,
              _getRequires(module.transformed)
            );
            module._dependencies = {};
            module.transformed_args = _geFunctionArgsNames(module.transformed);

            for (var i in module.dependencies) {
              var isRealitive = false;
              var dependency = module.dependencies[i];
              if (dependency.indexOf("../") == 0 || dependency.indexOf("./") == 0)
                isRealitive = true;
              module.dependencies[i] = isRealitive ?
                path.join(module.name, path.dirname(module.path), dependency) :
                module.dependencies[i];
              module._dependencies[dependency] = await module.getDependencyModule(
                module.dependencies[i],
                isRealitive
              );
            } // for(var j in module._dependencies){
            //   module._dependencies[j] = await  module._dependencies[j];
            // }

            module.context.modules[modulePath] = module;
            resolve(module);
          },
          module.transform,
          module.modulePath,
          process
      );
    });
  };

/*
  Module.prototype.load = async function load() {
    var module = this;
    var dependency = module.dependency;
    return new Promise(async function moduleLoad(resolve) {
      // module.definition = await $$fetch(module.modulePath);
      module.definition = false;

      if (module.modulePath.substr(-1) == "/") {
        module.path = module.path + "index.js";
      }

      if (!dependency.needs_extention || module.modulePath.substr(-3) == ".js")
        module.definition = await $$fetch(module.modulePath);

      if (module.definition === false) {
        module.definition = await $$fetch(module.modulePath + ".js");

        if (!(module.definition === false)) {
          module.path = module.path + ".js";
          dependency.needs_extention = true;
        } else module.definition = false;
      }

      if (module.definition === false) {
        module.definition = await $$fetch(module.modulePath + "/index.js");

        if (!(module.definition === false)) {
          module.path = module.path + "/index.js";
        } else module.definition = false;
      }

      if (module.definition === false) {
        var e = ""
          .concat(module.name, " no definition @ ")
          .concat(module.modulePath, " ");
        console.error(e);
        throw new Error(e);
      }

      console.log(
        "loaded module",
        module.dependency.name +
        "@" +
        module.dependency.version +
        "/" +
        module.path
      );
      var useReact = (module.dependency.package && module.dependency.package.react);
      module.transform = $$transform(module.definition, module.modulePath, useReact ? true : false);
      $$exec(
        $$global,
        async function define(modulePath, deps, transformed_module) {
            if (modulePath != module.modulePath) throw "something bad happend"; //something bad happend

            if (!transformed_module && typeof deps == "function") {
              transformed_module = deps;
              deps = [];
            }

            module.transformed = transformed_module;
            module.dependencies = [].concat(
              deps,
              _getRequires(module.transformed)
            );
            module._dependencies = {};
            module.transformed_args = _geFunctionArgsNames(module.transformed);

            for (var i in module.dependencies) {
              var isRealitive = false;
              var dependency = module.dependencies[i];
              if (dependency.indexOf("../") == 0 || dependency.indexOf("./") == 0)
                isRealitive = true;
              module.dependencies[i] = isRealitive ?
                path.join(module.name, path.dirname(module.path), dependency) :
                module.dependencies[i];
              module._dependencies[dependency] = await module.getDependencyModule(
                module.dependencies[i],
                isRealitive
              );
            } // for(var j in module._dependencies){
            //   module._dependencies[j] = await  module._dependencies[j];
            // }

            module.context.modules[modulePath] = module;
            resolve(module);
          },
          module.transform,
          module.modulePath,
          process
      );
    });
  };
*/
  Module.prototype.getDependencyModule = function getDependencyModule(
    modulePath,
    isRealitive
  ) {
    var module = this;
    var context = module.context; // var contextDependency = module.context.dependency;

    var dep = parseModulePath(modulePath); // var depVersion = isRealitive ? module.dependency.version : null;

    var dependency = isRealitive ? module.dependency : null;

    if (!dependency) {
      dependency = module.dependency.getDependency(dep.name);

      if (dependency.name != dep.name) {
        dep.name = dependency.name;
        dep.path = modulePath;
      }

      dependency;
    }

    var defMod;

    if (dependency) {
      // if(dep.name != context.id)
      defMod = dependency.loadModule(dep.path || "main", module);
    } else if (dep.name !== context.id) {
      defMod = module.getDependencyModule(context.id + "/" + modulePath);
    }

    if (defMod) {
      return defMod;
    }

    throw "no dependcy module found";
  };

  Module.prototype.export = async function () {
    var module = this;
    var promise = new Promise(async (resolve) => {
      if (module.exported) return resolve(module.exported);

      if (module.transformed) {
        for (var i in module._dependencies) {
          if (
            module._dependencies[i] !== module &&
            !module._dependencies[i].exported
          ) {
            // console.log(this.dependency.name, this.dependency.version, module.modulePath, "loading", module._dependencies[i].modulePath);
            await module._dependencies[i].export();
          }
        }

        module.loaded = false;
        var $$$EXPORTS = {};
        var $module = {
          _exports: $$$EXPORTS,
          get exports() {
            return this._exports;
          },
          set exports(val) {
            this._exports = val;
          },
          get isPreloading() {
            return !module.loaded;
          },
          get loaded() {
            return module.loaded;
          },
          get id() {
            return module.name + "/" + module.path;
          },
          get path() {
            return path.dirname(this.id);
          },
          get filename() {
            return module.modulePath;
          },
          get require() {
            return module.context.require;
          }
        };
        var reDefined = false;
        /* require, exports, module, define */

        try {
          // throw "hello";
          var defineRequire = function definedRequire($$moduleName) {
            var $dep = module._dependencies[$$moduleName];
            if ($dep && $dep.exported)
              return $dep.exported.exports || $dep.exported; // console.log(dep)

            throw "module not exported";
          };
          var $$exported;
          var $$exported_async = module.transformed.call($$$EXPORTS, {
            require: defineRequire,
            exports: $module.exports,
            module: $module,
            define: function reDefine($$name, $$deps, $$definition) {
              //this needs to be an AMD/UMD/COMMONJS loader
              reDefined = true;

              if (typeof $$name == "function") {
                $$definition = $$name;
              }

              $$exported = $$definition(
                defineRequire,
                $module.exports,
                $module
              ); // throw "defined called again"
            }
          });

          if (isPromise($$exported_async))
            $$exported_async = await $$exported_async;

          if (!reDefined) {
            if ($$$EXPORTS === $$exported_async.exports //exports var never changed
              &&
              $module.exports !== $$exported_async.exports) { // and module.exports is not the same as $$exported_async.exports
              $$exported = $module.exports; // then $module.exports is the output
            } else {
              $$exported = $$exported_async.exports || $$exported_async;
            }

            if ($$exported.__esModule && $$exported.default)
              $$exported = $$exported.default;


          }

        } catch (e) {
          var errorLineNumber;

          try {
            if (e.stack)
              errorLineNumber = e.stack
              .split("\n")[1]
              .split("<anonymous>")[2]
              .substr(
                0,
                e.stack.split("\n")[1].split("<anonymous>")[2].length - 1
              ); // eslint-disable-next-line
          } catch (ee) {}

          errorLineNumber =
            url.parse(module.modulePath).pathname +
            (errorLineNumber || "#" + e);
          console.error(errorLineNumber);
          throw e;
        }

        module._reDefined = reDefined;
        module.exported = $$exported || $module.exports; //es modules default to module.exports;

        if (module.exported.__esModule && module.exported.default)
          module.exported = module.exported.default;
      }
      module.loaded = true;
      return resolve(module.exported);
    });
    return promise;
  };

  var GLOBALCONTEXT_CALLBACK_ID_INCRECEMENT = 0;

  function Context(id) {
    var context = this;
    this.id = id;
    this.require = this.require.bind(this);
    this.require.context = this;
    this.context = this;
    this.dependencies = {}; //version specific loaded from cache

    this._dependencies = {}; //version specific

    this.modules = {};
    this.registry = Registry(context);
    this.dependency = new Dependency(context, context.id, "0.0.0");
    this.dependency.attachTo(this.dependency); //circular attachment

    context.defineModule("fetch", () => {
      return this._fetch;
    });

    for (var i in nodeDeps)
      ((i) =>
        context.defineModule(i, () => {
          return nodeDeps[i];
        })
      )(i);

  }

  // Context.

  Context.prototype = new events.EventEmitter();

  Context.prototype._fetch = $$fetch;

  Context.prototype.install = function install(packageURL, callback) {
    var context = this;
    var dependency = context.dependency;
    var promise = new Promise(async function contextInstall(resolve) {
      var packageDependency = new Dependency(context);

      var packageURL_Path = context.parsePath(packageURL);
      var packageURL_ModPath = parseModulePath(packageURL);
      var $_resolved;
      if (packageURL_ModPath.registry == "file") {
        packageDependency.setRegistry("node_modules");
        packageDependency.setPackagePath(packageURL_Path.href);
        await packageDependency.load();
      } else if (!packageURL_ModPath.registry) {
        packageDependency.setRegistry("unpkg");
        if (packageURL_ModPath.name == packageURL || packageURL_ModPath.name + "@" + packageURL_ModPath.version == packageURL) {
          packageDependency.name = packageURL_ModPath.name;
          if (packageURL_ModPath.version) {
            packageDependency.version = packageURL_ModPath.version;
          }
          // packageDependency.setPackage();
          await packageDependency.load();
        }
      }
      if (packageDependency.loaded) {
        packageDependency.attachTo(dependency);
        console.warn("Installed Dependency", packageDependency.name + "@" + packageDependency.version, "for", dependency.name + "@" + dependency.version);

        $_resolved = (
          await context.require([packageDependency.name], callback)
        )[0];

        resolve($_resolved || packageDependency);
        return;
      }
      return resolve(false);
    });
    return promise;
  };

  Context.prototype.require = function contextRequire(deps, callback) {
    var callbackModule = arguments.callee.caller._module;
    var context = this.context;
    var $dependency = context.dependency;
    // console.warn("require called from", _getCallerFile());

    if (typeof deps === "function") {
      callback = deps;
      deps = [];
    }

    if (typeof deps === "string" && !callback) {
      var dep = parseModulePath(deps);
      var dependency = $dependency.getDependency(dep.name);

      if (dependency.name != dep.name) {
        dep.name = dependency.name;
        dep.path = deps;
      }

      if (dependency) {
        var module = dependency.loadModule(dep.path, callbackModule);
        var exported = module.exported;
        if (exported && exported.exports) return exported.exports;
        else if (exported) return exported;
      }

      throw "".concat(deps, " dependency not loaded");
    } else if (typeof deps === "string") {
      deps = [deps];
    }

    callbackModule = new Module(
      $dependency,
      "_callback@" + ++GLOBALCONTEXT_CALLBACK_ID_INCRECEMENT
    );
    deps = [].concat(
      deps,
      _getRequires(callback || "function dummy_callback(){}")
    ); // var argsNames = _geFunctionArgsNames(callback || `function dummy_callback(){}`);

    return new Promise(async (resolve) => {
      var dependency;
      var $_resolved = [];

      for (var i in deps) {
        var dep = parseModulePath(deps[i]);
        $dependency;
        dependency = $dependency.getDependency(dep.name);

        if (dependency.name != dep.name) {
          dep.name = dependency.name;
          dep.path = deps[i];
        }

        if (dependency) {
          var mod = await dependency.loadModule(dep.path, callbackModule);
          var exported_mod = await mod.export();
          $_resolved.push(exported_mod);
          if (!mod) throw "module not found";
        } else {
          throw "dependency not found";
        }

        dependency = false;
      } // console.log("callback deps+args", deps, argsNames);

      if (callback) {
        callback._module = callbackModule;
        $_resolved = callback.apply({}, [$_resolved]);
      }

      resolve($_resolved);
    });
  };

  Context.prototype.defineModule = function defineModule(
    moduleName,
    deps,
    transformed
  ) {
    if (!transformed && typeof deps == "function") {
      transformed = deps;
      deps = [];
    }

    var context = this;
    var dependency = context.dependency;
    var module = (dependency.modules[moduleName] = new Module(
      dependency,
      moduleName
    ));
    module.transformed = transformed;
    module.export();
    // module.dependencies = [].concat(deps, _getRequires(module.transformed));
    // module._dependencies = {};
    // module.transformed_args = _geFunctionArgsNames(module.transformed);

    // for (var i in module.dependencies) {
    //   var isRealitive = false;
    //   var _dependency = module.dependencies[i];
    //   if (_dependency.indexOf("../") == 0 || _dependency.indexOf("./") == 0)
    //     isRealitive = true;
    //   module.dependencies[i] = isRealitive ?
    //     path.join(module.name, path.dirname(module.path), _dependency) :
    //     module.dependencies[i];
    //   module._dependencies[_dependency] = await module.getDependencyModule(
    //     module.dependencies[i],
    //     isRealitive
    //   );
    // }

    // console.log(
    //   "defined module",
    //   dependency.name + "@" + dependency.version + "/" + moduleName
    // );
    return module;
  };

  Context.prototype.parsePath = function parsePath(
    $$baseFile,
    $$pathOverRide
  ) {

    var context = this;
    var baseFile = __urlify($$baseFile),
      $path = $$pathOverRide && __urlify($$pathOverRide);
    // if(baseFile == "./") baseFile = "/";

    // if (!$path && baseFile) {
    //   $path = baseFile;
    //   baseFile = context.basePath;
    // }

    // $path = url.parse($path);
    // baseFile = url.parse(baseFile);
    // if(!baseFile.protocol) throw "baseFile must have url protocol";


    // if (!baseFile.protocol && typeof window == "undefined") {
    //   baseFile = url.parse(url.pathToFileURL(baseFile.pathname).href);
    // } else if (!baseFile.protocol && !(typeof window == "undefined")) {
    //   baseFile.hostname = window.location.hostname;
    //   baseFile.protocol = window.location.protocol;
    // }

    // protocol = $path.protocol || baseFile.protocol;
    // hostname = $path.hostname || baseFile.hostname;
    // if(hostname == baseFile.hostname){
    //   if($path.pathname.indexOf("/") == 0)
    //     pathname = $path.pathname;
    //   else
    //     pathname = path.join(path.dirname(baseFile.pathname), $path.pathname);
    // }
    // else
    //   pathname = $path.pathname;

    // var href = protocol + "//" + hostname + pathname;
    // var outURL = __urlify(href);

    // if(!baseFile.protocol) throw "baseFile must have url protocol";
    if (baseFile.protocol && ["file:", "http:", "https:"].indexOf(baseFile.protocol) == -1)
      return baseFile.href;

    if ($path) {
      if ($path.hostname && !($path.hostname == baseFile.hostname)) {
        baseFile.hostname = $path.hostname;
        baseFile.pathname = "/";
        baseFile.pathname = $path.pathname;
        baseFile.protocol = $path.protocol;
      } else {
        baseFile.pathname = $path.pathname;
      }
    }
    return baseFile;
  };

  function parseModulePath(modulePath) {
    modulePath = modulePath.split("/"); //split the module path    
    var dep = {};
    dep.name = modulePath.shift(); //take the fist section as the name
    var registry = dep.name.split(":");

    if (registry.length > 1) { //pull registry
      dep.registry = registry.shift();
      dep.name = registry.join(":");
    }

    dep.path = modulePath.join("/"); //rejoin the path
    dep.apt = modulePath.length; //how many times we can shift
    if (dep.path == "") dep.path = false; //if no path set it as boolean

    dep.shift = function () { //shifting the dep name
      dep.name += "/" + modulePath.shift();
      dep.path = modulePath.join("/");
      if (dep.path == "") dep.path = false;
      dep.apt = modulePath.length;
    };

    if (dep.name.indexOf("@") == 0) dep.shift(); //pull org

    if (dep.name.split("@").length >= 2) { //pull version
      dep.name = dep.name.split("@");
      dep.version = dep.name.pop();
      dep.name = dep.name.join("@");
    }

    return dep;
  }
  Context.prototype.parseModulePath = parseModulePath;

  function __urlify(href) {
    var outURL = url.parse(href);
    delete outURL.href;
    Object.defineProperty(outURL, "href", {
      get() {
        return outURL.format();
      }
    });
    delete outURL.path;
    Object.defineProperty(outURL, "path", {
      get() {
        return outURL.pathname;
      },

      set(val) {
        outURL.pathname = val;
      }
    });
    var $pathName = outURL.pathname;
    delete outURL.pathName;
    Object.defineProperty(outURL, "pathname", {
      get() {
        return $pathName;
      },

      set(val) {
        if (val.indexOf("/") == 0) $pathName = val;
        else $pathName = path.join(path.dirname($pathName + "."), val);
      }
    });

    Object.defineProperty(outURL, "basename", {
      get() {
        if (this.pathname.substr(-1) == "/")
          return null;
        return path.basename(this.pathname);
      },

      set(val) {
        this.pathname = "./" + val;
      }
    });

    Object.defineProperty(outURL, "basedir", {
      get() {
        return path.dirname(this.pathname) + "/";
      },

      set(val) {
        var basename = this.basename;
        this.pathname = path.join(this.basedir, val) + basename;
      }
    });

    return outURL;
  }
  Context.prototype._urlify = __urlify;

  function _geFunctionArgsNames(callback) {
    var args = [];
    if (callback)
      callback.toString().replace(functionArgsNames, function (match, $args) {
        args = $args.split(",");
      });
    return args;
  }

  function _getRequires(callback) {
    var deps = [];
    if (callback)
      callback
      .toString()
      .replace(commentRegExp, commentReplace)
      .replace(cjsRequireRegExp, function (match, dep) {
        deps.push(dep);
      });
    return deps;
  }

  return Context;
};
