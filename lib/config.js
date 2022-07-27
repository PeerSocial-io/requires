var isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
    isWebWorker = !isBrowser && typeof importScripts !== 'undefined';

module.exports = {
  commentRegExp : /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
  cjsRequireRegExp : /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
  jsSuffixRegExp : /\.js$/,
  jsExtRegExp : /^\/|:|\?|\.js$/,
  currDirRegExp : /^\.\//,
  readyRegExp : isBrowser && navigator.platform === 'PLAYSTATION 3' ? /^complete$/ : /^(complete|loaded)$/,
  defContextName : '_',
  op : Object.prototype,
  ostring : Object.prototype.toString,
  hasOwn : Object.prototype.hasOwnProperty,
  isBrowser:isBrowser,
  isWebWorker:isWebWorker,
  globalDefQueue: []
}