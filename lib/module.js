
var {
  events,
  path,
  url
} = require("./nodeDeps.js");

function isPromise(p) {
  if (p instanceof Promise) return true;
  if (typeof p === "object" && p.toString() === "[object Promise]") return true;
  if (typeof p === "object" && typeof p.then === "function") return true;
  return false;
}

var $$transform = (() => {
  var babel = require("@babel/standalone");

  var psiosPreset = require("./babel-psio").default;

  babel.registerPlugin("psio", psiosPreset);

  function transform(contents, modulePath, react) {
    //
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
        compact: true,
        minified: true,
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

    babelConfig = buildConfig();
    contents = babel.transform(contents, babelConfig).code; //basic transform, does a cleanup of code;

    babelConfig = buildConfig([babel.availablePresets["env"]]);
    contents = babel.transform(contents, babelConfig).code; //env transforms es6 to es5

    babelConfig = buildConfig(false, [babel.availablePlugins["psio"]]);
    contents = babel.transform(contents, babelConfig).code; //this wraps it into a transformed definition
    
    return contents;
  }

  return transform;
})();

function Module(dependency, modulePath, callerModule) {
  modulePath = path.normalize(modulePath);
  this.name = dependency.name;
  this.dependency = dependency;
  var context = (this.context = dependency.context);
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
  var context = module.context;
  var dependency = module.dependency;
  var $package = module.dependency.package;

  async function loadFile(filePath) {
    if (await $package.fileExist(filePath))
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
      if (context.debug) console.error(e);
      throw new Error(e);
    }

    if (context.debug) console.log(
      "loaded module",
      module.dependency.registry.name +
      ":" + 
      module.dependency.name +
      "@" +
      module.dependency.version +
      "/" +
      module.path
    );
    var useReact =
      module.dependency.package && module.dependency.package.react;
    module.transform = $$transform(
      module.definition,
      module.modulePath,
      useReact ? true : false
    );
    context._exec(
      context._global,
      async function define(modulePath, deps, transformed_module) {
          if (modulePath != module.modulePath) throw "something bad happend"; //something bad happend

          if (!transformed_module && typeof deps == "function") {
            transformed_module = deps;
            deps = [];
          }

          module.transformed = transformed_module;
          module.dependencies = [].concat(
            deps,
            context._getRequires(module.transformed)
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
          }

          module.context.modules[modulePath] = module;
          resolve(module);
        },
        module.transform,
        module.modulePath,
        process
    );
  });
};

Module.prototype.getDependencyModule = function getDependencyModule(
  modulePath,
  isRealitive
) {
  var module = this;
  var context = module.context;
  var dep = context.parseModulePath(modulePath);
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
  var context = module.context;
  var promise = new Promise(async (resolve) => {
    if (module.exported) return resolve(module.exported);

    if (module.transformed) {
      for (var i in module._dependencies) {
        if (
          module._dependencies[i] !== module &&
          !module._dependencies[i].exported
        ) {
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
          if (
            $$$EXPORTS === $$exported_async.exports && //exports var never changed
            $module.exports !== $$exported_async.exports
          ) {
            // and module.exports is not the same as $$exported_async.exports
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
        if (context.debug) console.error(errorLineNumber);
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

var functionArgsNames = /(?<=\()(.*?)(?=\))/;

function _geFunctionArgsNames(callback) {
  var args = [];
  if (callback)
    callback.toString().replace(functionArgsNames, function (match, $args) {
      args = $args.split(",");
    });
  return args;
}

module.exports = Module;