var webpack = require("webpack");
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var webpack_env = {};
if(!process.env.DEBUG) process.env.NODE_ENV = "production";
else process.env.NODE_ENV = "development";

// webpack_env['process.env._NODE_ENV'] = JSON.stringify(process.env.NODE_ENV);

webpack_env['global'] = "globalThis";

console.log("process.env.NODE_ENV", process.env.NODE_ENV);

var DEFINED = {
  "ifdef-verbose": true, // add this for verbose output
  "ifdef-triple-slash": false, // add this to use double slash comment instead of default triple slash
  "ifdef-fill-with-blanks": true, // add this to remove code with blank spaces instead of "//" comments
  "ifdef-uncomment-prefix": "// #code " // add this to uncomment code starting with "// #code "
};

console.log("__dirname", __dirname, process.env.DEBUG);

module.exports = function () {

  var index = {
    context: __dirname,
    // mode: 'production',
    // mode: 'development',
    mode: process.env.DEBUG ? 'development' : 'production',
    entry: {
      requires: './requires.js'
    },
    devServer: {
      allowedHosts: 'all',
      static: [path.resolve(__dirname, './')],
      hot: true,
      webSocketServer: false,
      client: {
        progress: true,
        overlay: true,
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser'
      }),
      new webpack.DefinePlugin(webpack_env),
      new HtmlWebpackPlugin({
        title: 'Development',
        template: './test.html',
        filename: "test.html",
        inject: false
      }),
      new CopyWebpackPlugin({
        patterns: [
          "./test.js",
        ]
      })
    ],
    node: {
      global: true
    },
    output: {
      filename: '[name].js',
      library: 'requires',
      path: path.resolve(__dirname, "./browser"),
      clean: true,
      libraryTarget: 'umd',
      globalObject: 'typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : this'
    },
    resolve: {
      fallback: {
        "vm": require.resolve("vm-browserify"),
        "crypto": require.resolve("crypto-browserify"),
        "path": require.resolve("path-browserify"),
        "stream": require.resolve("stream-browserify"),
        "os": require.resolve("os-browserify"),
        "https": require.resolve("https-browserify"),
        "http": require.resolve("stream-http"),
        "process": require.resolve("process"),
        "assert": require.resolve("assert"),
        "url": require.resolve("url"),
        "zlib": require.resolve("browserify-zlib"),
        "fs": false,
      },
      alias: {
        process: "process/browser"
      }
    },
    module: {
      rules: [{
        test: /\.(mjs|js|jsx)$/,
        include: path.resolve(__dirname, "./lib"),
        // exclude: /node_modules\/ifdef-loader/,
        use: [{
          loader: "ifdef-loader",
          options: DEFINED
        }],
      }, {
        test: /\.(mjs|js|jsx)$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false
        }
      }]
    },
  };

  
  console.log(index.mode);
  return [index];
};
