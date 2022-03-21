var lodash = require("lodash");
var ast = require("./util/parser");
var requirePackageName = require("require-package-name")
var isCoreModule = require("is-core-module")

exports.getDeclaredPkg = async function (filename, dir, deps, parser, detector) {
  const result = await parser(filename)
  return lodash(ast.getNodes(result))
    .map((node) => detect(detector, node, deps))
    .flatten()
    .uniq()
    .map(requirePackageName) // 获取dep实际的名字
    .filter((pkg) => !isCoreModule(pkg))// 去除系统自带依赖
    .value();
};

function detect(detector, node, deps) {
  try {
    return detector(node, deps);
  } catch (error) {
    console.log(error)
    return [];
  }
  return [];
}