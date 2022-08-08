(function (global, $$exec) {

  var nodeFetch = require("node-fetch").default;

  // var semver = require('semver');

  var {
    // defaultOnError,
    // isArray,
    // hasProp,
    getOwn
  } = require("./operators");

  var nodeDeps = require("./nodeDeps.js");
  var {
    // events,
    crypto,
    path,
    // util,
    url,
    // buffer
  } = nodeDeps;

  function uid() {
    return crypto.randomBytes(16).toString("hex");
  }

  var _Context = require("./newContext.js");

  function _getCallerFile() {
    var originalFunc = Error.prepareStackTrace;

    var callerfile;
    try {
      var err = new Error();
      var currentfile;

      Error.prepareStackTrace = function (err, stack) {
        return stack;
      };

      currentfile = err.stack.shift().getFileName();

      while (err.stack.length) {
        callerfile = err.stack.shift().getFileName();

        if (currentfile !== callerfile) break;
      }
    } catch (e) {
      e;
    }

    Error.prepareStackTrace = originalFunc;

    return callerfile;
  }

  (function ($$events, $$crypto, $$path, $$util, $$url, $$buffer, fetch) {
    var u; //for undefined;
    var Context = _Context($$fetch, $$exec);

    var contexts = {};
    var default_context = uid();

    var preDefinedProviders = {
      "https://unpkg.com/": {
        add_version: true,
        basePath:"https://unpkg.com/"
      }
    };

    function __matchPreDefinedProviders(provider) {
      var results = false;
      if (preDefinedProviders[provider])
        results = preDefinedProviders[provider];

      return results;
    }

    function makeContext(contextName) {

      var context;
      if (!contextName) contextName = default_context;

      context = getOwn(contexts, contextName);
      if (!context) {
        context = contexts[contextName] = new Context(contextName);
      }
      var mainRequire = context.require;

      context.basePath = "./";
      mainRequire.home = function (basePath) {
        if (!basePath) return context.basePath;
        
        if(basePath.substr(0 - 'package.json'.length) == 'package.json')
          basePath = basePath.substr(0, basePath.length - 'package.json'.length);

        if (basePath.substr(-1) != "/") basePath = basePath + "/";
        
        var __callerFile = _getCallerFile();
        context.basePath = context.parsePath(__callerFile, basePath).href;
        mainRequire.home = u;
      };

      context.provider = "./node_modules/";
      mainRequire.provider = function (packageProvider, providerConfig) {
        
        var packagePath = packageProvider || context.provider;

        context.provider_config = providerConfig = (
          providerConfig || 
          (packageProvider && __matchPreDefinedProviders(packageProvider)) ||
          context.provider_config
        );
        
        if (packagePath.substr(-1) != "/") packagePath = packagePath + "/";

        var __callerFile = _getCallerFile();
        var packageProviderURL = context.parsePath(providerConfig && providerConfig.basePath || __callerFile, packagePath);

        context.provider = packageProviderURL.href;
        mainRequire.provider = u;
        return context.provider;
      };

      mainRequire.install = async function (packagePath, callback) {
        if(mainRequire.home)
          mainRequire.home(context.basePath);

        if(mainRequire.provider)
          mainRequire.provider(context.provider);

        if(typeof callback == "undefined" && typeof packagePath == "function"){
          callback = packagePath;
          packagePath = false;
        }

        
        var basePath = context.parsePath(context.basePath);
        

        if(packagePath)
          if(packagePath.indexOf("./") == 0 || packagePath.indexOf("../") == 0){
            basePath.pathname = packagePath;
            packagePath = basePath.href;
          }else{
            packagePath = context.provider + packagePath;
          }

        
        // mainRequire.provider = u;
        // mainRequire.home = u;
        
        return context.install( packagePath , callback);
      };

      return mainRequire;
    }

    Context.prototype.makeContext = makeContext;
    if (!(typeof window == "undefined")) {
      fetch = new Proxy(fetch, {
        async apply(fetch, that, args) {
          // Forward function call to the original fetch
          var request = new Request(args[0]);
          var match = await caches.match(request);
          if (match) {
            return match;
          }

          return new Promise((resolve) => {

            var result = fetch.apply(that, [request]);

            // Do whatever you want with the resulting Promise
            result.then((response) => {
              caches.open('v1').then(function (cache) {
                cache.put(request, response.clone());
                
                resolve(response);
              });
              console.log("fetch completed!", args, response);
              
            });


          });
        }
      });


    }

    async function $$fetch($url, callback) {
      var promise = new Promise((resolve) => {
        var use_fs = false;
        $url = typeof $url == "object" ? $url : url.parse($url);
        if ($url.protocol == "file:") {
          use_fs = true;
        }
        var response = false;
        if (!use_fs) {
          fetch($url.href).then(async ($response) => {
            var responseURL = $response.url;
            var status = $response.status.toString();
            
            response = await $response.text();
              
            (callback && callback(response, responseURL, status));
            
            if ($url.href  !== $response.url) //is folder
              status = "404";
            
            resolve(!(["404"].indexOf(status) >= 0) ? response : false);
          });
        } else {

          var fs = "fs";
          fs = require(fs);
          var exists = fs.existsSync || path.existsSync;
          
          var status = "404";
          if (exists($url.path) && !fs.lstatSync($url.path).isDirectory()) {
            response = fs.readFileSync($url.path, 'utf8');
            status = "200";
          } 
          (callback && callback(response, $url.path, status));
          resolve(response);
        }
      });
      return promise;
    }

    module.exports = makeContext();

  })(require("events"), require("crypto"), require("path"), require("util"), require("url"), require("buffer"), nodeFetch);
  //next line eslint will say require and define are `declared but not used`
  // eslint-disable-next-line  
})(typeof global !== "undefined" ? global : this, function $eval(define /* context arguments[1] */ ) {
  try{
  eval(arguments[1]);
  }catch(err){
    console.error(err);
    throw err;
  }
});