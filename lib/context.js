var nodeDeps = require("./nodeDeps.js");

if (!process.platform && typeof navigator != "undefined")
  process.platform = navigator.platform.toLocaleLowerCase();

if(!(process.env["NODE_ENV" || 0])) 
  process.env["NODE_ENV" || 0] = process.env.NODE_ENV;

var {
  events,
  path,
  url
} = nodeDeps;

module.exports = function _Context($$fetch, $$exec, $$global) {
  function commentReplace(match, singlePrefix) {
    return singlePrefix || "";
  }

  var commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/gm,
    cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g; // jsSuffixRegExp = /\.js$/,
  // jsExtRegExp = /^\/|:|\?|\.js$/;

  var Registry = require("./registry");
  var Dependency = require("./dependency");
  var Module = require("./module");

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
        }))(i);
  } // Context.

  Context.prototype = new events.EventEmitter();
  Context.prototype._fetch = $$fetch;
  Context.prototype._exec = $$exec;
  Context.prototype._global = $$global;

  Context.prototype.install = function install(packageURL, callback) {
    var context = this;
    var dependency = context.dependency;
    var promise = new Promise(async function contextInstall(resolve) {
      var packageDependency = new Dependency(context);
      var packageURL_Path = context.parsePath(packageURL);
      var packageURL_ModPath = parseModulePath(packageURL);
      var $_resolved;

      if (["file", "http", "https"].indexOf(packageURL_ModPath.registry) >= 0) {
        packageDependency.setRegistry("node_modules");
        packageDependency.setPackagePath(packageURL_Path.href);
        await packageDependency.load();
      } else {
        
        packageDependency.setRegistry(packageURL_ModPath.registry || "npmjs");

        if (
          packageURL_ModPath.name == packageURL ||
          packageURL_ModPath.name + "@" + packageURL_ModPath.version == packageURL ||
          packageURL_ModPath.registry+":"+packageURL_ModPath.name == packageURL
        ) {
          packageDependency.name = packageURL_ModPath.name;

          if (packageURL_ModPath.version) {
            packageDependency.version = packageURL_ModPath.version;
          }

          await packageDependency.load();
        }
      }

      if (packageDependency.loaded) {
        packageDependency.attachTo(dependency);
        if(context.debug) console.info(
          "Installed Dependency",
          packageDependency.registry.name +
          ":" +
          packageDependency.name +
          "@" +
          packageDependency.version,
          "for",
          dependency.name + "@" + dependency.version
        );
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
    var callbackModule = arguments.callee.caller && arguments.callee.caller._module;
    var context = this.context;
    var $dependency = context.dependency;

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
      context._getRequires(callback || "function dummy_callback(){}")
    );
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
      }

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
    return module;
  };

  Context.prototype.parsePath = function parsePath($$baseFile, $$pathOverRide) {
    var context = this;
    var baseFile = context._urlify($$baseFile),
      $path = $$pathOverRide && context._urlify($$pathOverRide);

    if (
      baseFile.protocol && ["file:", "http:", "https:"].indexOf(baseFile.protocol) == -1
    )
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

  var parseModulePath = (Context.prototype.parseModulePath = function parseModulePath(modulePath) {
    modulePath = modulePath.split("/"); //split the module path

    var dep = {};
    dep.name = modulePath.shift(); //take the fist section as the name

    var registry = dep.name.split(":");

    if (registry.length > 1) {
      //pull registry
      dep.registry = registry.shift();
      dep.name = registry.join(":");
    }

    dep.path = modulePath.join("/"); //rejoin the path

    dep.apt = modulePath.length; //how many times we can shift

    if (dep.path == "") dep.path = false; //if no path set it as boolean

    dep.shift = function () {
      //shifting the dep name
      dep.name += "/" + modulePath.shift();
      dep.path = modulePath.join("/");
      if (dep.path == "") dep.path = false;
      dep.apt = modulePath.length;
    };

    if (dep.name.indexOf("@") == 0) dep.shift(); //pull org

    if (dep.name.split("@").length >= 2) {
      //pull version
      dep.name = dep.name.split("@");
      dep.version = dep.name.pop();
      dep.name = dep.name.join("@");
    }

    return dep;
  });

  Context.prototype._urlify = function __urlify(href) {
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
        if (this.pathname.substr(-1) == "/") return null;
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
  };

  Context.prototype._getRequires = function _getRequires(callback) {
    var deps = [];
    if (callback)
      callback
      .toString()
      .replace(commentRegExp, commentReplace)
      .replace(cjsRequireRegExp, function (match, dep) {
        deps.push(dep);
      });
    return deps;
  };

 

  return Context;
};
