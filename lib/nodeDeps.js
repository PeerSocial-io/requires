var events = require("events");
var crypto = require("crypto");
var path = require("path");
var util = require("util");
var url = require("url");
var buffer = require("buffer");
var process = require("process");

if(!(typeof window == "undefined")){
  window.Buffer = buffer.Buffer;
}

module.exports = {
  events: events,
  crypto: crypto,
  path: path,
  util: util,
  url: url,
  buffer: buffer,
  process: process
}