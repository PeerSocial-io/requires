module.exports = () => {
  var __callerFile = _getCallerFile();

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
    return (process.browser ? "" : "file://") + callerfile;
  }

  return (function ($$global, $$exec, $$exec_VM) {
    var nodeFetch = require("node-fetch").default;

    var nodeDeps = require("./nodeDeps.js");

    var {
      crypto,
      path,
      url
    } = nodeDeps;

    function uid() {
      return crypto.randomBytes(16).toString("hex");
    }

    var _Context = require("./context");

    if (typeof window == "undefined") $$exec = $$exec_VM;
    return (function () {
      var u; //for undefined;

      var Context = _Context($$fetch, $$exec, $$global);

      var contexts = {};
      var default_context = uid();

      function makeContext(contextName) {
        var context;
        if (!contextName) contextName = uid();
        context = contexts[contextName];

        if (!context) {
          context = contexts[contextName] = new Context(contextName);
        }

        var mainRequire = context.require;
        context.basePath = false;

        mainRequire.home = function (basePath) {
          var had = !!context.basePath;
          if (!basePath && had) return context.basePath;
          else if (!basePath) basePath = "./";
          if (basePath.substr(0 - "package.json".length) == "package.json")
            basePath = basePath.substr(
              0,
              basePath.length - "package.json".length
            );
          if (basePath.substr(-1) != "/") basePath = basePath + "/";
          if (
            had &&
            !(basePath.indexOf("../") == 0 || basePath.indexOf("./") == 0)
          )
            context.basePath = context.parsePath(basePath).href;
          else {
            if (!had)
              context.basePath = context.parsePath(__callerFile, basePath).href;
            else
              context.basePath = context.parsePath(
                context.basePath,
                basePath
              ).href;
          }
          if (had) mainRequire.home = u;
        };

        mainRequire.home();

        mainRequire.install = async function (packagePath, callback) {
          if (mainRequire.home) mainRequire.home(context.basePath);

          if (
            typeof callback == "undefined" &&
            typeof packagePath == "function"
          ) {
            callback = packagePath;
            packagePath = false;
          }

          var basePath = context.parsePath(context.basePath);
          if (packagePath)
            if (
              packagePath.indexOf("./") == 0 ||
              packagePath.indexOf("../") == 0
            ) {
              basePath.pathname = packagePath;
              packagePath = basePath.href;
            } else {
              var $packagePath = context.parsePath(packagePath);
              if ($packagePath.hostname) packagePath = $packagePath.href;
            }
          return context.install(packagePath, callback);
        };

        mainRequire.define = async function (moduleName,
          deps,
          transformed) {

          return context.install(moduleName,
            deps,
            transformed);
        };

        mainRequire.registry = context.registry;

        Object.defineProperty(mainRequire, 'cache', {
          set(val) {
            useCache = val;
          },
          get() {
            return useCache;
          }
        });
        
        Object.defineProperty(mainRequire, 'debug', {
          set(val) {
            context.debug = val;
          },
          get() {
            return context.debug;
          }
        });

        return mainRequire;
      }

      Context.prototype.makeContext = makeContext;
      var useCache = ["registry.npmjs.org", "unpkg.com"];

      if (useCache && !(typeof window == "undefined")) {
        nodeFetch = new Proxy(nodeFetch, {
          async apply(_fetch, that, args) {
            // Forward function call to the original fetch
            var request = new Request(args[0]);

            var $$url = url.parse(request.url);
            if (
              useCache.indexOf($$url.hostname) >= 0
            ) {
              var match = await caches.match(request);

              if (match) {
                // console.debug("Cached Loaded", request.url);
                return match;
              }
            }

            return new Promise((resolve) => {
              var result = _fetch.apply(that, [request]); // Do whatever you want with the resulting Promise

              result.then((response) => {

                if (useCache.indexOf($$url.hostname) >= 0)
                  caches.open($$url.hostname).then(function (cache) {
                    cache.put(request, response.clone()); // console.log("fetch completed!", args, response);
                    resolve(response);
                  });
                else
                  resolve(response);
              });
            });
          }
        });
      }

      async function $$fetch($url, callback) {
        var exportBuffer = false;

        if (typeof callback == "string") {
          switch (callback) {
            case "buffer":
              exportBuffer = true;
              break;

            default:
              break;
          }

          callback = false;
        }

        var promise = new Promise((resolve) => {
          var use_fs = false;
          $url = typeof $url == "object" ? $url : url.parse($url);

          if ($url.protocol == "file:") {
            use_fs = true;
          }

          var response = false;

          if (!use_fs) {
            try {
              nodeFetch($url.href)
                .then(async ($response) => {
                  var responseURL = $response.url;
                  var status = $response.status.toString();
                  if (exportBuffer) response = await $response.arrayBuffer();
                  else response = await $response.text();
                  callback && callback(response, responseURL, status);
                  if ($url.href !== $response.url)
                    status = "404";
                  resolve(!(["404"].indexOf(status) >= 0) ? response : false);
                })
                .catch(function (e) {
                  console.log(e);
                });
            } catch (e) {
              console.log(e);
            }
          } else {
            var fs = "fs";
            fs = require(fs);
            var exists = fs.existsSync || path.existsSync;
            var status = "404";

            if (exists($url.path) && !fs.lstatSync($url.path).isDirectory()) {
              response = fs.readFileSync($url.path, "utf8");
              status = "200";
            } else {
              //404
              status;
            }

            callback && callback(response, $url.href, status);
            resolve(response);
          }
        });
        return promise;
      }

      return makeContext(default_context);
    })(); //next line eslint will say require and define are `declared but not used`
    // eslint-disable-next-line
  })(typeof global !== "undefined" ? global : this, function $eval(global, define /* context, filepath, process */ ) {
      // eslint-disable-next-line
      var process = arguments[4];

      try {
        eval(arguments[2]);
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    function (global, define, content, filepath) {
      var vm = require("vm");

      function EvalContext() {
        this.define = define;
      }

      EvalContext.prototype = global;
      var context = new EvalContext();
      context = vm.createContext(context);
      vm.createContext(context);
      var script = new vm.Script(content, "<eval>:" + filepath);
      script.runInContext(context);
    }
  );
};
