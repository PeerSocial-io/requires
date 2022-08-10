const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const CopyWebpackPlugin = require('copy-webpack-plugin');

const webpack_env = {};

// webpack_env['process.env.NODE_DEBUG'] = JSON.stringify(true);


const DEFINED = {
  DEBUG: true,
  "ifdef-verbose": true, // add this for verbose output
  "ifdef-triple-slash": false, // add this to use double slash comment instead of default triple slash
  "ifdef-fill-with-blanks": true, // add this to remove code with blank spaces instead of "//" comments
  "ifdef-uncomment-prefix": "// #code " // add this to uncomment code starting with "// #code "
};

console.log("__dirname", __dirname);

module.exports = {
  context: __dirname,
  mode: 'development',
  entry: {
    index: './index.js'
  },
  devServer: {
    allowedHosts: 'all',
    static: [path.resolve(__dirname, './'), path.resolve(__dirname, './dist')],  
    webSocketServer:false,
  },
  plugins: [
    // new CopyWebpackPlugin({
    //   patterns: [{
    //     from: path.resolve(__dirname, './app'),
    //     to: './app'
    //   }]
    // }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new webpack.DefinePlugin(webpack_env),
    new HtmlWebpackPlugin({
      title: 'Development',
    }),
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
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
      test: /\.(js|jsx)$/,
      exclude: /node_modules\/(?!(peersocial.io\/src)\/).*/,
      use: [{
          loader: "ifdef-loader",
          options: DEFINED
        }
        // ,{

        //   loader: "babel-loader",
        //   options: {
        //     presets: ["@babel/preset-env"],
        //   },
        // },
      ],
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