var acorn = require("acorn");
var babel = require("@babel/parser");
var file = require("../util/file");

exports.default = async function (filename) {
  const content = await file.getContent(filename);
  try {
    return babel.parse(content, {
      sourceType: "module",

      // Enable all known compatible @babel/parser plugins at the time of writing.
      // Because we only parse them, not evaluate any code, it is safe to do so.
      // note that babel/parser 7+ does not support *, due to plugin incompatibilities
      plugins: [
        "asyncGenerators",
        "bigInt",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        // ['decorators', { decoratorsBeforeExport: true }],
        "decorators-legacy",
        "doExpressions",
        "dynamicImport",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "flow",
        "flowComments",
        "functionBind",
        "functionSent",
        "importMeta",
        "logicalAssignment",
        "nullishCoalescingOperator",
        "numericSeparator",
        "objectRestSpread",
        "optionalCatchBinding",
        "optionalChaining",
        ["pipelineOperator", { proposal: "minimal" }],
        "throwExpressions",
      ],
    });
    // acorn.parse(content, acorn.defaultOptions)
  } catch (error) {
    console.log(error);
    console.log(filename);
    return 0;
  }
};

module.exports = exports.default;
