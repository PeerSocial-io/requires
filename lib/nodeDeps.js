var events = require("events");
var crypto = require("crypto");
var path = require("path");
var util = require("util");
var url = require("url");
var process = require("process");
var assert = require("assert");
var vm = require("vm");
var stream = require("stream");
var os = require("os");
var http = require("http");
var https = require("https");
var zlib = require("zlib");
var buffer = require("buffer");


var tar = require("@obsidize/tar-browserify");


if (!(typeof window == "undefined")) {
  window.Buffer = buffer.Buffer;
}

module.exports = {
  events: events,
  crypto: crypto,
  path: path,
  util: util,
  url: url,
  buffer: buffer,
  process: process,
  assert: assert,
  vm: vm,
  stream: stream,
  os: os,
  http: http,
  https: https,
  zlib: zlib,
  tar: tar
};


if (buffer.atob) module.exports.atob = buffer.atob;
if (buffer.btoa) module.exports.btoa = buffer.btoa;
if (buffer.Blob) module.exports.Blob = buffer.Blob;
