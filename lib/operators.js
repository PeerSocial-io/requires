

var {
  // commentRegExp,
  // cjsRequireRegExp,
  // jsSuffixRegExp,
  // jsExtRegExp,
  // currDirRegExp,
  // readyRegExp,
  // defContextName,
  // op,
  ostring,
  hasOwn,
  // globalDefQueue,
  // isBrowser,
  // isWebWorker
} = require("./config");

function defaultOnError(err) {
  throw err;
}

function commentReplace(match, singlePrefix) {
  return singlePrefix || '';
}

function bind(obj, fn) {
  return function () {
    return fn.apply(obj, arguments);
  };
}

function isFunction(it) {
  return ostring.call(it) === '[object Function]';
}

function isArray(it) {
  return ostring.call(it) === '[object Array]';
}

function each(ary, func) {
  if (ary) {
    var i;
    for (i = 0; i < ary.length; i += 1) {
      if (ary[i] && func(ary[i], i, ary)) {
        break;
      }
    }
  }
}

function hasProp(obj, prop) {
  return hasOwn.call(obj, prop);
}

function getOwn(obj, prop) {
  return hasProp(obj, prop) && obj[prop];
}

var nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
  setTimeout(fn, 4);
} : function (fn) {
  fn();
};

function eachProp(obj, func) {
  var prop;
  for (prop in obj) {
    if (hasProp(obj, prop)) {
      if (func(obj[prop], prop)) {
        break;
      }
    }
  }
}

function mixin(target, source, force, deepStringMixin) {
  if (source) {
    eachProp(source, function (value, prop) {
      if (force || !hasProp(target, prop)) {
        if (deepStringMixin && typeof value === 'object' && value &&
          !isArray(value) && !isFunction(value) &&
          !(value instanceof RegExp)) {

          if (!target[prop]) {
            target[prop] = {};
          }
          mixin(target[prop], value, force, deepStringMixin);
        } else {
          target[prop] = value;
        }
      }
    });
  }
  return target;
}


function makeError(message, moduleName) {
  var err = new Error(message);
  err.requireModules = [moduleName];
  return err;
}
function eachReverse(ary, func) {
  if (ary) {
    var i;
    for (i = ary.length - 1; i > -1; i -= 1) {
      if (ary[i] && func(ary[i], i, ary)) {
        break;
      }
    }
  }
}

function scripts() {
  return document.getElementsByTagName('script');
}

module.exports = {
  defaultOnError: defaultOnError,
  commentReplace: commentReplace,
  bind: bind,
  isFunction: isFunction,
  isArray: isArray,
  each: each,
  hasProp: hasProp,
  getOwn: getOwn,
  nextTick: nextTick,
  eachProp: eachProp,
  mixin: mixin,
  makeError: makeError,
  eachReverse: eachReverse,
  scripts: scripts
}