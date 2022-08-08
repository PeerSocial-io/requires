// const {
//   defaultOnError
// } = require("./operators.js");

var nodeDeps = require("./nodeDeps.js");
var {
  events,
  // crypto,
  path,
  // util,
  url,
  // buffer
} = nodeDeps;

var $$transform = (() => {
  var babel = require("@babel/standalone");
  var psiosPreset = require("./babel-psio").default;
  babel.registerPlugin("psio", psiosPreset);

  function transform(contents, modulePath) {
    var ext = modulePath.split(".").pop();
    if (ext == "json") {
      contents = "module.exports = JSON.parse('" + JSON.stringify(JSON.parse(contents)) + "');";
    }

    if (!contents)
      throw "cant not transform nothing";

    function buildConfig(presets, plugins) {
      var config = {
        sourceMaps: "inline",
        sourceFileName: url.parse(modulePath).href,
        filename: url.parse(modulePath).href,
        moduleId: url.parse(modulePath).href,
        moduleIds: true,
        moduleRoot: url.parse(modulePath).href
        // "targets": {
        // 	"esmodules": false
        // }
      };
      if (presets)
        config.presets = presets;
      if (plugins)
        config.plugins = plugins;
      return config;
    }

    var babelConfig;

    babelConfig = buildConfig([babel.availablePresets["env"]]);
    contents = babel.transform(contents, babelConfig).code;


    babelConfig = buildConfig(false, [babel.availablePlugins["psio"]]);
    contents = babel.transform(contents, babelConfig).code;

    // console.log(modulePath, contents)
    return contents;
  }
  return transform;
})();

module.exports = function _Context($$fetch, $$exec) {


  var semver = require('semver');

  function commentReplace(match, singlePrefix) {
    return singlePrefix || '';
  }

  var commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
    cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
    functionArgsNames = /(?<=\()(.*?)(?=\))/;
    // jsSuffixRegExp = /\.js$/,
    // jsExtRegExp = /^\/|:|\?|\.js$/;

  function Dependency(context, depName, depVersion) {
    // console.warn("registering dependency", depName + "@" + depVersion, (parentDep ? "for " + parentDep.name + "@" + parentDep.version : ""));
    this.context = context;
    this.modules = {};
    this.dependencies = {};// holds the list of dependencies by version
    this._dependencies = {};//holds the version pointer

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
    this.name = depName;
    this.version = depVersion;

    if (!this.loaded) {
      this.setPackagePath();
    }

    // if (parentDep) {      
    //   this.parentDep = parentDep;
    //   if (!parentDep.dependencies[this.name]) parentDep.dependencies[this.name] = {};

    //   parentDep.dependencies[this.name][this.version] = this;
    // }

    // if (!context.dependencies[this.name]) context.dependencies[this.name] = {};
    // if (!context.dependencies[this.name][this.version]) {
    //   context.dependencies[this.name][this.version] = this;
    // }

    // if (context._dependencies[this.name]) {
    //   if (parentDep)
    //     if (parentDep._dependencies[this.name])
    //       throw `dependency [${this.name}] already defined for ${parentDep.name}`;
    //   else
    //     parentDep._dependencies[this.name] = this.version;
    // } else {
    //   context._dependencies[this.name] = this.version;
    // }

  }

  Dependency.prototype = new events.EventEmitter();

  Dependency.prototype.setPackagePath = function setPackagePath(customPath) {
    // var dependency = this;
    var packagePath = "";

    if (customPath) {
      packagePath = customPath;
    } else {

      packagePath = this.context.provider + this.name;
      if (this.context.provider_config)
        packagePath += "@" + this.version;
    }

    if (packagePath && packagePath.substr(-1) != "/") packagePath = packagePath + "/";

    this.path = packagePath;
    this.package_json_path = this.path + "package.json";
    return packagePath;
  };
  Dependency.prototype.load = function load(callerModule) {
    var callback = (callerModule instanceof Module) ? false : callerModule;
    if (callback) callerModule = false;
    var dependency = this;
    // var context = dependency.context;
    var promise = new Promise(async function dependencyLoad(resolve) {
      if (dependency.loaded)
        return resolve(dependency);
      
      await dependency.loadPackage();

      dependency.loaded = true;
      
      // var $for = dependency.parentDep ? dependency.parentDep.name + "@" + dependency.parentDep.version : dependency.name + "@" + dependency.version;
      // var $self = packageJSON.name + "@" + packageJSON.version;
      // console.log("loading package-dependency", $for, $self)

      if (dependency.package.dependencies) {
        var deps = JSON.parse(JSON.stringify(dependency.package.dependencies));
        for (var i in deps) 
          await dependency.addDependency(i, deps[i]);
      }

      if (dependency.package.main) {
        var mainModule = dependency.modules["main"] = new Module(dependency, dependency.package.main);
        await mainModule.load(callerModule || mainModule);
      }

      if (callback)
        callback(dependency);
      resolve(dependency);

    });
    return promise;
  };

  
  Dependency.prototype.loadPackage = function loadPackage(parrentPackage) {
    var dependency = this;
    var context = dependency.context;
    return new Promise(async function dependencyLoad(resolve) {
      if (dependency.package)
        return resolve(dependency);
      $$fetch(dependency.package_json_path, async function dependencyLoad(packageJSON, resolvedURL, status) {
        if (resolvedURL) resolvedURL = context.parsePath(resolvedURL).href;

        if (status !== '200') throw `${dependency.package} status is ${status} and needs to be 200`;
        packageJSON = JSON.parse(packageJSON);

        if (dependency.name != packageJSON.name)
          throw "module name missmatch";

        
        dependency._version = dependency.version;
        if(packageJSON.version !== dependency.version){
          if (semver.satisfies(packageJSON.version, dependency.version)) {
            dependency.version = packageJSON.version;
            // console.warn(dependency.name, "version changed", dependency._version, dependency.version);
          }else{
            if(!path.basename(context.provider) == "node_modules"){
            //this should never happen.. as we requested this version.
              throw `${packageJSON.name}@${packageJSON.version} doesnt satisfy ${dependency.name}@${dependency.version}  `;
            }

            if(parrentPackage){
              dependency.setPackagePath(parrentPackage.path+"node_modules/"+dependency.name);
              resolve(await dependency.loadPackage());
            }


          }
        }

        if (resolvedURL !== dependency.package_json_path) {
          dependency.setPackagePath();//reset the packagePath, just incase we chaged the version
          if (resolvedURL !== dependency.package_json_path)
            throw "package provider to name+version missmatch";
        }

        dependency.package = packageJSON;

        resolve(dependency);
      });
    });
  };

  Dependency.prototype.loadModule = function loadModule(modulePath, callerModule, callback) {
    var dependency = this;
    // var context = this.context;

    if (!modulePath)
      modulePath = (dependency.package && dependency.package.main) || "main";

    if (dependency.modules[modulePath])
      return dependency.modules[modulePath];

    var promise = new Promise(async function loadModulePromise(resolve) {
      if (!dependency.loaded)
        await dependency.load(callerModule);
      var $modulePath = modulePath || dependency.package.main || "main";
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

  Dependency.prototype.addDependency = function addDependency(dependencyName, dependencyVersion) {

    var parentDependency = this;
    var context = this.context;
    var contextDependency = context.dependency;

    var promise = new Promise(async (resolve) => {
      
      var dependency = new Dependency(context, dependencyName, dependencyVersion);
      await dependency.loadPackage(parentDependency);

      if(Dependency._cached[dependency.name + "@" + dependency.version]){
        dependency = Dependency._cached[dependency.name + "@" + dependency.version];
        // console.warn("Re-Used Dependency", dependencyName + "@" + dependencyVersion, "for", parentDependency.name +"@"+parentDependency.version);
      }else{
        Dependency._cached[dependency.name + "@" + dependency.version] = dependency;
        if(!contextDependency.hasDependency(dependency.name,dependency.version))
          dependency.attachTo(contextDependency);
          
        // console.warn("Added Dependency", dependencyName + "@" + dependencyVersion, "for", parentDependency.name +"@"+parentDependency.version);        
      }

      dependency.attachTo(parentDependency);

      resolve(dependency);
    });

    return promise;
  };

  Dependency.prototype.attachTo = function(parentDep){    
    var dependency = this;
    
    // dependency.parentDep = parentDep;

    if (!parentDep.dependencies[dependency.name]) parentDep.dependencies[dependency.name] = {};

    parentDep.dependencies[dependency.name][dependency.version] = dependency;
    parentDep._dependencies[dependency.name] = dependency.version;

  };

  Dependency.prototype.hasDependency = function(dependencyName, dependencyVersion){    
    var $dependency = this;
    var dep = parseModulePath(dependencyName);

    if(!dependencyVersion){
      if ((dependencyVersion = $dependency._dependencies[dep.name]) && $dependency.dependencies[dep.name][dependencyVersion]){
        return true;
      }      
    }else{
      if ($dependency.dependencies[dep.name] && $dependency.dependencies[dep.name][dependencyVersion]){
        return true;
      }   
    }
    
    return false;
  };

  Dependency.prototype.getDependency = function getDependency(dependencyName, dependencyVersion) {
    var $dependency = this;
    var context = this.context;
    var dep = parseModulePath(dependencyName);

    var dependency;

    if(!dependencyVersion){
      if ((dependencyVersion = $dependency._dependencies[dep.name]) && $dependency.dependencies[dep.name][dependencyVersion]){
        dependency = $dependency.dependencies[dep.name][dependencyVersion];
      }      
    }else{
      if ($dependency.dependencies[dep.name] && $dependency.dependencies[dep.name][dependencyVersion]){
        dependency = $dependency.dependencies[dep.name][dependencyVersion];
      }   
    }
    // if (!dependency) {
    //   if ((dependencyVersion = $dependency._dependencies[dep.name]) && $dependency.dependencies[dep.name][dependencyVersion])
    //     dependency = $dependency.dependencies[dep.name][dependencyVersion];
    // }

    if (!dependency) {
      if (context.dependencies[dep.name]) {
        dependency = context.dependencies[dep.name][dependencyVersion || "0.0.0"];
      }
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
    modulePath = path.normalize(modulePath);

    // if (dependency.name !== dependency.context.id)
    //   console.log("created module", "'" + dependency.name + "@" + dependency.version + "/" + modulePath + "'");
    this.name = dependency.name;
    this.dependency = dependency;
    this.context = dependency.context;
    this.path = modulePath;

    Object.defineProperty(this, 'pathName', {
      get() {
        return this.name + "/" + this.path;
      }
    });
    Object.defineProperty(this, 'modulePath', {
      get() {
        var $path = dependency.path;
        if (!$path) {
          return dependency.name + "/" + this.path;
        }
        if ($path && $path.substr(-1) != "/") $path = $path + "/";
        $path = parsePath($path);
        $path.href = false;
        $path.pathname = $path.name = path.join($path.pathname, this.path);
        return $path.format();
      }
    });

    this.callers = [];
    if (callerModule)
      this.callers.push(callerModule);

    dependency.modules[modulePath] = this;
  }

  Module.prototype = new events.EventEmitter();

  Module.prototype.load = async function load(/*callerModule*/) {
    var module = this;
    var dependency = module.dependency;
    return new Promise(async function moduleLoad(resolve) {

      // module.definition = await $$fetch(module.modulePath);
      if(!dependency.needs_extention || module.modulePath.substr(-3) == ".js")
        module.definition = await $$fetch(module.modulePath);

      if (!module.definition) {
        module.definition = await $$fetch(module.modulePath + ".js");
        if (module.definition) {
          module.path = module.path + ".js";
          dependency.needs_extention = true;
        }
      }

      if (!module.definition) {
        module.definition = await $$fetch(module.modulePath + "/index.js");
        if (module.definition) {
          module.path = module.path + "/index.js";
        }
      }

      if (!module.definition) {
        var e = `${module.name} no definition @ ${module.path} `;
        console.error(e);
        throw e;
      }

      console.log("loaded module", module.dependency.name + "@" + module.dependency.version + "/" + module.path);
      
      module.transform = $$transform(module.definition, module.modulePath);

      $$exec(async function exec(modulePath, deps, transformed_module) {
        if (modulePath != module.modulePath) throw "something bad happend"; //something bad happend

        if (!transformed_module && typeof deps == "function") {
          transformed_module = deps;
          deps = [];
        }

        module.transformed = transformed_module;

        module.dependencies = [].concat(deps, _getRequires(module.transformed));
        module._dependencies = {};
        module.transformed_args = _geFunctionArgsNames(module.transformed);



        for (var i in module.dependencies) {
          var isRealitive = false;
          var dependency = module.dependencies[i];
          if (dependency.indexOf("../") == 0 || dependency.indexOf("./") == 0)
            isRealitive = true;

          module.dependencies[i] = isRealitive ? path.join(module.name, path.dirname(module.path), dependency) : module.dependencies[i];

          module._dependencies[dependency] = await module.getDependencyModule(module.dependencies[i], isRealitive);



          dependency;
        }
        module.context.modules[modulePath] = module;
        resolve(module);
      }, module.transform);

    });
  };

  Module.prototype.getDependencyModule = function getDependencyModule(modulePath, isRealitive) {
    var module = this;
    var context = module.context;
    // var contextDependency = module.context.dependency;
    var dep = parseModulePath(modulePath);

    // var depVersion = isRealitive ? module.dependency.version : null;
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
          if (module._dependencies[i] !== module && !module._dependencies[i].exported) {
            // console.log(this.dependency.name, this.dependency.version, module.modulePath, "loading", module._dependencies[i].modulePath);
            await module._dependencies[i].export();
          }
        }

        var $module = {
          exports: {}
        };
        var reDefined = false;
        /* require, exports, module, define */
        try {
          // throw "hello";
          var defineRequire = function definedRequire($$moduleName) {
            var $dep = module._dependencies[$$moduleName];

            if ($dep && $dep.exported)
              return $dep.exported.exports || $dep.exported;
            // console.log(dep)
            throw "module not exported";
          };
          var $$exported = module.transformed(defineRequire, $module.exports, $module, function ($$name, $$deps, $$definition) {
            reDefined = true;

            if (typeof $$name == "function") {
              $$definition = $$name;
            }

            $$exported = $$definition(defineRequire, $module.exports, $module);

            // throw "defined called again"
          });
        } catch (e) {
          var errorLineNumber;
          try {
            if(e.stack)
              errorLineNumber = e.stack.split("\n")[1].split('<anonymous>')[2].substr(0, e.stack.split("\n")[1].split('<anonymous>')[2].length - 1);
              // eslint-disable-next-line  
          } catch (ee) {}
          errorLineNumber = url.parse(module.modulePath).pathname + (errorLineNumber || "#"+e);
          console.error(errorLineNumber);

          throw e;
        }
        module._reDefined = reDefined;
        module.exported = $$exported || $module.exports;

        //es modules default to module.exports;
        if (module.exported.__esModule && module.exported.default)
          module.exported = module.exported.default;
      }

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
    this.dependencies = {};//version specific loaded from cache
    this._dependencies = {};//version specific
    this.modules = {};
    this.packages = {};
    this.package;
    this.package_path;
    this.registry = {};
    this.dependency = new Dependency(context, context.id, "0.0.0");
    this.dependency.attachTo(this.dependency);//circular attachment 

    for (var i in nodeDeps) ((i) => context.defineModule(i, () => { return nodeDeps[i]; }))(i);
    
  }

  Context.prototype = new events.EventEmitter();


  Context.prototype.install = function install(packageURL, callback) {
    var context = this;
    var dependency = context.dependency;

    var promise = new Promise(function contextInstall(resolve) {

      var packageURL_JSON;
      if (packageURL.substr(0 - 'package.json'.length) == 'package.json') {
        packageURL = packageURL.substr(0, packageURL.length - 'package.json'.length);
      }

      if (packageURL.substr(-1) != "/") packageURL = packageURL + "/";

      packageURL_JSON = packageURL + "package.json";

      var packageDependency;

      $$fetch(packageURL_JSON, async function contextInstall(packageJSON, resolvedURL) {
        if(packageURL_JSON != resolvedURL)
          console.warn("INSTALL:", packageURL_JSON, "!=", resolvedURL);
        packageJSON = JSON.parse(packageJSON);

        packageDependency = new Dependency(context, packageJSON.name, packageJSON.version);
        packageDependency.setPackagePath(packageURL);

        await packageDependency.load();
        
        packageDependency.attachTo(dependency);

        var $_resolved;
        // if (callback){
        $_resolved = await context.require([packageDependency.name], callback);
        // }       
        resolve($_resolved || packageDependency);
      });
    });
    return promise;
  };

  Context.prototype.require = function contextRequire(deps, callback) {
    var callbackModule = arguments.callee.caller._module;
    var context = this.context;
    var $dependency = context.dependency;

    console.warn("require called from", _getCallerFile());

    if (typeof deps === 'function') {
      callback = deps;
      deps = [];
    }

    if (typeof deps === 'string' && !callback) {

      var dep = parseModulePath(deps);
      var dependency = $dependency.getDependency(dep.name);
      if (dependency.name != dep.name) {
        dep.name = dependency.name;
        dep.path = deps;
      }

      if (dependency) {
        var module = dependency.loadModule(dep.path, callbackModule);
        var exported = module.exported;
        if (exported && exported.exports)
          return exported.exports;
        else if (exported)
          return exported;
      }

      throw `${deps} dependency not loaded`;

    } else if (typeof deps === 'string') {
      deps = [deps];
    }

    callbackModule = new Module($dependency, "_callback@" + (++GLOBALCONTEXT_CALLBACK_ID_INCRECEMENT));

    deps = [].concat(deps, _getRequires(callback || `function dummy_callback(){}`));
    // var argsNames = _geFunctionArgsNames(callback || `function dummy_callback(){}`);

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
          if (!mod)
            throw "module not found";

        } else {
          throw "dependency not found";
        }


        dependency = false;
      }

      // console.log("callback deps+args", deps, argsNames);

      if (callback) {
        callback._module = callbackModule;
        $_resolved = callback.apply({}, [$_resolved]);
      }
      resolve($_resolved);
    });


  };


  Context.prototype.defineModule = async function defineModule(moduleName, deps, transformed) {
    if (!transformed && typeof deps == "function") {
      transformed = deps;
      deps = [];
    }

    var context = this;
    var dependency = context.dependency;

    var module = dependency.modules[moduleName] = new Module(dependency, moduleName);

    module.transformed = transformed;
    module.dependencies = [].concat(deps, _getRequires(module.transformed));
    module._dependencies = {};
    module.transformed_args = _geFunctionArgsNames(module.transformed);

    for (var i in module.dependencies) {
      var isRealitive = false;
      var _dependency = module.dependencies[i];
      if (_dependency.indexOf("../") == 0 || _dependency.indexOf("./") == 0)
        isRealitive = true;
      module.dependencies[i] = isRealitive ? path.join(module.name, path.dirname(module.path), _dependency) : module.dependencies[i];
      module._dependencies[_dependency] = await module.getDependencyModule(module.dependencies[i], isRealitive);
    }
    console.log("defined module", dependency.name + "@" + dependency.version + "/" + moduleName);
    return module;
  };

  var parsePath = Context.prototype.parsePath = function parsePath(baseFile, $path) {
    // var context = this;
    var protocol, hostname, pathname;
    if (!$path && baseFile) {
      $path = baseFile;
      baseFile = "/";
    }

    $path = url.parse($path);
    baseFile = url.parse(baseFile);

    if (!baseFile.protocol && (typeof window == "undefined")) {
      baseFile = url.parse(url.pathToFileURL(baseFile.pathname).href);
    } else if (!baseFile.protocol && !(typeof window == "undefined")) {
      baseFile.hostname = window.location.hostname;
      baseFile.protocol = window.location.hostname;
    }

    protocol = $path.protocol || baseFile.protocol;
    hostname = $path.hostname || baseFile.hostname;
    pathname = path.join(path.dirname(baseFile.pathname), $path.pathname);

    var href = protocol + "//" + hostname + pathname;

    var outURL = url.parse(href);

    delete outURL.href;    
    Object.defineProperty(outURL, 'href', {
      get() {
        return outURL.format();
      }
    });

    
    delete outURL.path;    
    Object.defineProperty(outURL, 'path', {
      get() {
        return outURL.pathname;
      },
      set(val){
        outURL.pathname = val;
      }
    });

    var $pathName = outURL.pathname;
    delete outURL.pathName;    
    Object.defineProperty(outURL, 'pathname', {
      get() {
        return $pathName;
      },
      set(val){
        if(val.indexOf("/") == 0)
          $pathName = val;
        else
          $pathName = path.join(path.dirname($pathName+"."), val);
      }
    });

    return outURL;

      
  };


  function parseModulePath(modulePath) {
    modulePath = modulePath.split("/");
    var dep = {};
    dep.name = modulePath.shift();
    var registry = dep.name.split(":");
    if (registry.length > 1) {
      dep.registry = registry.shift();
      dep.name = registry.join(":");
    }
    dep.path = modulePath.join("/");
    dep.apt = modulePath.length;
    if (dep.path == '') dep.path = false;
    dep.shift = function () {
      dep.name += "/" + modulePath.shift();
      dep.path = modulePath.join("/");
      if (dep.path == '') dep.path = false;
      dep.apt = modulePath.length;
    };
    if (dep.name.indexOf("@") == 0) dep.shift();
    return dep;
  }

  function _geFunctionArgsNames(callback) {
    var args = [];
    if (callback)
      callback
      .toString()
      .replace(functionArgsNames, function (match, $args) {
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
  
  var libPath = _getCallerFile();
  console.log("libPath",libPath);

  // function _getErrorStack(err){
  //   var stack;
  //   var originalFunc = Error.prepareStackTrace;
  //   try {
  //     Error.prepareStackTrace = function (err, stack) {
  //       return stack;
  //     };
  //     stack = err.stack;
  //   } catch (e) {
  //     e;
  //   }
  //   Error.prepareStackTrace = originalFunc;
  //   return stack;
  // }
  
  function _getCallerFile() {
    var originalFunc = Error.prepareStackTrace;

    var callerfile;
    try {
      var err = new Error();

      Error.prepareStackTrace = function (err, stack) {
        return stack;
      };

      var $stack = err.stack;

      var currentfile = $stack.shift().getFileName();

      while (err.stack.length) {
        var $callerfile = err.stack.shift().getFileName();

        if($callerfile.indexOf("node:") == 0) 
          continue;
        
        callerfile = $callerfile;
        
        if (currentfile !== callerfile) 
          break;
      }
    } catch (e) {
      e;
    }

    Error.prepareStackTrace = originalFunc;

    return callerfile;
  }
  return Context;
};
