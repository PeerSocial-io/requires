(function (global, $$exec) {
  
  var nodeFetch = require("node-fetch");

  var babel = require("@babel/standalone/babel.js");
  var psiosPreset = require("./babel-psio").default
  babel.registerPlugin("psio", psiosPreset);
  var requiresEnvPreset = require("@babel/preset-env").default;
  babel.registerPreset("requires-env", requiresEnvPreset);

  (function ($$require, $$events, $$crypto, $$path, $$util, $$url, $$buffer, $$babel, fetch, location) {

    var require;

    var {
      // commentRegExp,
      // cjsRequireRegExp,
      // jsSuffixRegExp,
      // jsExtRegExp,
      // currDirRegExp,
      // readyRegExp,
      defContextName,
      // op,
      // ostring,
      // hasOwn,
      // isBrowser,
      // isWebWorker
    } = require("./config");

    var {
      defaultOnError,
      // commentReplace,
      // bind,
      // isFunction,
      isArray,
      // each,
      hasProp,
      getOwn,
      // nextTick,
      // eachProp,
      // mixin,
      // makeError
    } = require("./operators")

      // globalDefQueue = [],

    var contexts = {};

    var newContext = require("./newContext.js")

    function mainRequire(deps, callback, errback, optional) {

      //Find the right context, use default
      var context, config,
        contextName = defContextName;

      // Determine if have config object in the call.
      if (!isArray(deps) && typeof deps !== 'string') { //so if deps is an object
        // then deps is the config object
        config = deps;
        if (isArray(callback)) { //but if callback is a array
          // then we need to Adjust args if there are dependencies
          deps = callback;
          callback = errback;
          errback = optional;
        } else {
          deps = [];
        }
      }

      if (config && config.context) {
        contextName = config.context;
      }

      context = getOwn(contexts, contextName);
      if (!context) {
        context = contexts[contextName] = newContext(contextName, $$load);
      }

      if (config) {
        context.configure(config);
      }

      return context.require(deps, callback, errback);
    }
    require = mainRequire;

    // define = mainDefine;
    require.onError = defaultOnError;

    function $$load(context, moduleName, url, map, looped) {
      var makeWrapper = function (contents) {
        // var $$FILENAME = $$path.parse($$url.parse(url).path).base,
        //   $$ROOTPATH = $$path.parse($$url.parse(url).path).dir;
          // $$SOURCEPATH = $$url.parse(url).href.replace($$ROOTPATH + "/" + $$FILENAME, "")

        var babelConfig = {
          sourceMaps: "inline",
          sourceFileName: $$url.parse(url).href,
          filename: $$url.parse(url).href,
          moduleId: $$url.parse(url).href,
          moduleIds: true,
          moduleRoot: $$url.parse(url).href,
          "presets": [
            $$babel.availablePresets["requires-env"],
          ],
          // "plugins": [
          //   $$babel.availablePlugins["psio"]
          // ],
          // "targets": {
          // 	"esmodules": false
          // }
        };

        contents = $$babel.transform(contents, babelConfig).code;
        babelConfig = {
          sourceMaps: "inline",
          sourceFileName: $$url.parse(url).href,
          filename: $$url.parse(url).href,
          moduleId: $$url.parse(url).href,
          moduleIds: true,
          moduleRoot: $$url.parse(url).href,
          // "presets": [
          //   $$babel.availablePresets["requires-env"],
          // ],
          "plugins": [
            $$babel.availablePlugins["psio"]
          ],
          // "targets": {
          // 	"esmodules": false
          // }
        };

        contents = $$babel.transform(contents, babelConfig).code;
        console.log(contents)
        return contents;
      };

      var requestType = "fetch";

      var $url = $$url.parse(url);
      if ($url.protocol == "file:") {
        // url = 
        requestType = "fs"
      }


      if (requestType === 'fetch') {

        fetch(url).then(async (response) => {
          var responseURL = response.url;
          var status = response.status;
          response = await response.text();

          if (status == 200) {

            response = makeWrapper(response, responseURL, context);

            map.url = responseURL;
          } else if (status == 404 || status == 302) {
            if (!looped) {
              map.url = url = url.replace(".js", "/index.js")
              return $$load(context, moduleName, url, map, true)
            }
            response = "";
          }

          try {
            map.content = response;
            map.moduleName = moduleName;
            $$exec(context.require, context.define, response);


            // console.log("require", url, map, context)

          } catch (err) {
            console.log(moduleName, err);
            return;
          }

          //Support anonymous modules.
          context.completeLoad(moduleName);

        })

      } else if (requestType === 'fs') {

        var fs = "fs"
        fs = $$require(fs);

        var exists = fs.existsSync || $$path.existsSync
        var contents, err,
          config = context.config;

        if (config.shim[moduleName] && (!config.suppress || !config.suppress.nodeShim)) {
          console.warn('Shim config not supported in Node, may or may not work. Detected ' +
            'for module: ' + moduleName);
        }

        if (exists($url.path)) {
          contents = fs.readFileSync($url.path, 'utf8');

          contents = makeWrapper(contents);

          try {
            // var vm = $$require("vm");
            // var thisContext = vm.createContext(context.scope)
            // thisContext.helloworld = true;
            // var script = new vm.Script(contents, {
            //   filename: fs.realpathSync(url)
            // });
            // script.runInContext(thisContext);

            $$exec(context.require, context.define, contents);
            console.log("require", $url.path, map, context)
            // console.log("require", url, map, thisContext, context)
          } catch (e) {
            err = new Error('Evaluating ' + $url.path + ' as module "' +
              moduleName + '" failed with error: ' + e);
            err.originalError = e;
            err.moduleName = moduleName;
            err.requireModules = [moduleName];
            err.fileName = url;
            return context.onError(err);
          }
        } else {
          context.define(moduleName, function () {
            //Get the original name, since relative requires may be
            //resolved differently in node (issue #202). Also, if relative,
            //make it relative to the URL of the item requesting it
            //(issue #393)
            var dirName,
              map = hasProp(context.registry, moduleName) &&
              context.registry[moduleName].map,
              parentMap = map && map.parentMap,
              originalName = map && map.originalName;

            if (originalName.charAt(0) === '.' && parentMap) {
              dirName = parentMap.url.split('/');
              dirName.pop();
              originalName = dirName.join('/') + '/' + originalName;
            }

            try {
              return $$require(originalName);
            } catch (e) {
              err = new Error('Tried loading "' + moduleName + '" at ' +
                url + ' then tried node\'s require("' +
                originalName + '") and it failed ' +
                'with error: ' + e);
              err.originalError = e;
              err.moduleName = originalName;
              err.requireModules = [moduleName];
              throw err;
            }
          });
        }

        //Support anonymous modules.
        context.completeLoad(moduleName);
      }
    }

    function setBaseUrl(fileName) {
      //Use the file name's directory as the baseUrl if available.
      var dir = fileName.replace(/\\/g, '/');
      if (dir.indexOf('/') !== -1) {
        dir = dir.split('/');
        dir.pop();
        dir = dir.join('/');
        //Make sure dir is JS-escaped, since it will be part of a JS string.
        require({
          baseUrl: dir.replace(/[\\"']/g, '\\$&')
        })

      }
    }

    // if (env === 'node') {
    //   setBaseUrl("file://"+$$path.resolve(__filename ? __filename : '.'));
    //   module.exports = require;
    //   return;
    // } else if (env === 'browser') {
    //Only option is to use the API.
    setBaseUrl(location.href);
    module.exports = require;
    //   return;
    // }

  })(require, require("events"), require("crypto"), require("path"), require("util"), require("url"), require("buffer"), babel, nodeFetch.default, typeof location !== "undefined" ? location : require("url").parse("file://" + __filename));
  // eslint-disable-next-line
})(typeof global !== "undefined" ? global : this, function (require, define /* context arguments[2] */ ) {
  eval(arguments[2]);
});