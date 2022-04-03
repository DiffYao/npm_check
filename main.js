const check = require("./check");
const lodash = require("lodash");
const getDefinedPkg = require("./get_defined_pkg");

exports.check = function (rootDir) {
  var detectors = [
    require("./detector/requireCallExpression"),
    require("./detector/importCallExpression"),
    require("./detector/importDeclaration"),
  ];
  var parser = require("./parser/parser");

  // 获取定义的package
  var dep = getDefinedPkg.getDeps(rootDir);

  deps = dep.deps;
  devDeps = dep.devdeps;
  check
    .checkProject(rootDir, parser, detectors)
    .then((result) => buildResult(result, deps, devDeps))
    .then(console.log);
};

function buildResult(result, deps, devDeps) {
  const usingDepsLookup = lodash(result.using)
    .toPairs()
    .map(([file, dep]) => [dep, lodash.times(dep.length, () => file)])
    .map((pairs) => lodash.zip(...pairs))
    .flatten()
    .groupBy(([dep]) => dep)
    .mapValues((pairs) => pairs.map(lodash.last))
    .value();

  const usingDeps = Object.keys(usingDepsLookup);

  const missingDepsLookup = (() => {
    const allDeps = lodash.union(deps, devDeps);

    const missingDeps = lodash.difference(usingDeps, allDeps);
    return lodash(missingDeps)
      .map((missingDep) => [missingDep, usingDepsLookup[missingDep]])
      .fromPairs()
      .value();
  })();

  const watestDepsLookup = (() => {
    const allDeps = lodash.union(deps, devDeps);
    const missingDeps = lodash.difference(allDeps, usingDeps);
    return missingDeps;
  })();

  return {
    DefinedButNotUsed: lodash.difference(deps, usingDeps),
    UsedButNotDefined: missingDepsLookup,
    Used: usingDepsLookup,
    InvalidFiles: result.invalidFiles,
    InvalidDirs: result.invalidDirs,
  };
}

module.exports = exports.check