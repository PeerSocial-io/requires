"use strict";
/* global  */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _babelTemplate = require("babel-template");

var _babelTemplate2 = _interopRequireDefault(_babelTemplate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildDefine = (0, _babelTemplate2.default)("define(MODULE_NAME, FACTORY);");

var buildFactory = (0, _babelTemplate2.default)(
`(async function defined({require, exports, module, define}) {
  BODY;
  RETURN;
})`);

var _default = (0, _helperPluginUtils.declare)((api) => {

  api.assertVersion(7);

  return {
    name: "psio",
    visitor: {
      Program: {
        exit(path) {
          // return;
          var moduleName = this.getModuleName();
          if (moduleName && moduleName !== "NONE") moduleName = api.types.stringLiteral(moduleName);else moduleName = null;

          var node = path.node;

          var factory = buildFactory({
            // PARAMS: params,
            BODY: node.body,
            RETURN: api.types.ReturnStatement(api.types.Identifier("new Promise((resolve)=> resolve({module:module, exports:exports}))"))
          });
          // factory.expression.body.directives = node.directives;
          // node.directives = [];

          node.body = [buildDefine({
            MODULE_NAME: moduleName,
            // SOURCES: sources,
            FACTORY: factory
          })];
        }

      }
    }
  };
});

exports.default = _default;