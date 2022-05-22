var getDefinedPkg = require("./get_defined_pkg");
var dev = require("./get_dependence");
var lodash = require("lodash");
var parser = require("./parser/parser");
var requireDetector = require("./detector/requireCallExpression");
var importDetector = require("./detector/importCallExpression");

// 获取定义的package
rootDir = process.cwd() + "/easy_app";
fileName = rootDir + "/index.js";

depDefined = getDefinedPkg.getDeps(rootDir);
console.log("package.json中声明的 pkg");

detectors = [
  requireDetector, 
  importDetector,
]
// 获取项目中声明的pkg
dev
  .getDeclaredPkg(fileName, rootDir, depDefined, parser, detectors)
  .then((depUsed) => {
    console.log("使用的依赖: ");
    console.log(depUsed);
    // 初步结论

    // 定义但未使用的依赖
    var definedNotUsedDep = lodash(depDefined)
      .without(...depUsed)
      .value();
    console.log("定义但未使用的依赖:");
    console.log(definedNotUsedDep);

    // 使用却未定义的依赖 （幽灵依赖）
    var phantomDep = lodash(depUsed)
      .without(...depDefined)
      .value();
    console.log("使用却未定义的依赖 幽灵依赖:");
    console.log(phantomDep);
  });
