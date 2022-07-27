var requires =require("./lib/requires.js")
var path = require("path");

// requires(["./app/somemodule.js"], function(module){
//   console.log("test.js",module)
//  })

function setBaseUrl(fileName) {
  //Use the file name's directory as the baseUrl if available.
  var dir = fileName.replace(/\\/g, '/');
  if (dir.indexOf('/') !== -1) {
    dir = dir.split('/');
    dir.pop();
    dir = dir.join('/');
    //Make sure dir is JS-escaped, since it will be part of a JS string.
    requires({
      baseUrl: dir.replace(/[\\"']/g, '\\$&')
    })

  }
}

if (typeof window == "undefined") {
  setBaseUrl("file://"+path.resolve(__filename ? __filename : '.'));
} else {
  setBaseUrl(location.href);
}

requires(["./app/somemodule.js"], function(module){
  console.log("test.js",module)
 })
 