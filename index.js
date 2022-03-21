var getDefinedPkg = require("./get_defined_pkg");
var dev = require("./get_dependence");
var lodash = require("lodash");
var parser = require("./parser/esprima");
var detector = require("./detector/requireCallExpression");

// 获取定义的package
rootDir = "/Users/diffyao/Code/node_learn/easy_app";
fileName = "/Users/diffyao/Code/node_learn/easy_app/index.js";

depDefined = getDefinedPkg.getDeps(rootDir);
console.log("package.json中声明的 pkg");
console.log(depDefined);

// 获取项目中声明的pkg
dev
  .getDeclaredPkg(fileName, rootDir, depDefined, parser, detector)
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