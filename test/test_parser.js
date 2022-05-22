const fs = require("fs");
const path = require("path");
const parser = require("./parser/acorn_parser");
var ast = require("./util/parser");
var requirePackageName = require("require-package-name");
var isCoreModule = require("is-core-module");
const lodash =require('lodash')

function checkPathExist(dir, errorMessage) {
  return new Promise((resolve, reject) =>
    fs.exists(dir, (result) => (result ? resolve() : reject(errorMessage)))
  );
}

async function cli() {
  try {
    const dir = process.argv.slice(2)[0];
    const rootDir = path.resolve(dir);
    ParserTest(rootDir);
  } catch (err) {
    console.error(err);
    process.exitCode = -1;
  }
}


function ParserTest(rootDir) {
  var detector = [
    require("./detector/requireCallExpression"),
    require("./detector/importCallExpression"),
    require("./detector/importDeclaration"),
  ];
  deps = []

  const result = parser(rootDir).then((val) => {
    lodash(ast.getNodes(val))
      .map((node) => detect(detector, node, deps))
      .flatten()
      .uniq()
      .map(requirePackageName) // 获取dep实际的名字
      .filter((pkg) => !isCoreModule(pkg)) // 去除系统自带依赖
      .value();
  });
}

function detect(detectors, node, deps) {
  
  return lodash(detectors)
    .map((detector) => {
      try {
        var res = detector(node, deps);
        if (res.toString() != [].toString()) {
          console.log(res);
        }
        return detector(node, deps);
      } catch (error) {
        console.log(error);
        return [];
      }
    })
    .flatten()
    .value();
}

cli();