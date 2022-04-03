var rootDir = process.cwd() + "/easy_app";
const prettyjson = require('prettyjson')
var check = require("./get_dependence");
var lodash = require("lodash");
var parser = require("./parser/esprima");
var requireDetector = require("./detector/requireCallExpression");
var importDetector = require("./detector/importCallExpression");

const readdirp = require("readdirp");
const ignorer = require("./ignorer/ignorer").Init(rootDir);

var detectors = [
  requireDetector, 
  importDetector,
]

function isModule(dir) {
  try {
    readJSON(path.resolve(dir, "package.json"));
    return true;
  } catch (error) {
    return false;
  }
}

// 获取所有待处理文件，过滤一些无用文件
const finder = readdirp(rootDir, {
  fileFilter: (entry) => !ignorer.ignores(entry.path),
  directoryFilter: (entry) =>
    !ignorer.ignores(entry.path) && !isModule(entry.fullPath),
});

const promises = [];

finder.on("data", (entry) => {
  promises.push(check.getDependence(entry.fullPath, null, parser, detectors));
});

finder.on("warn", (error) => {
  promises.push(
    Promise.resolve({
      invalidDirs: {
        [error.path]: error,
      },
    })
  );
});

finder.on("end", () => {
  Promise.all(promises).then((results) => {
    results.reduce(
      (obj, current) => ({
        using: mergeBuckets(obj.using, current.using || {}),
        invalidFiles: Object.assign(obj.invalidFiles, current.invalidFiles),
        invalidDirs: Object.assign(obj.invalidDirs, current.invalidDirs),
      }),
      {
        using: {},
        invalidFiles: {},
        invalidDirs: {},
      }
    );
  });
});

function mergeBuckets(object1, object2) {
  return lodash.mergeWith(object1, object2, (value1, value2) => {
    const array1 = value1 || [];
    const array2 = value2 || [];
    return array1.concat(array2);
  });
}

function buildResult(
  result,
  deps,
  devDeps,
  peerDeps,
  optionalDeps,
  skipMissing,
) {
  const usingDepsLookup = lodash(result.using)
    // { f1:[d1,d2,d3], f2:[d2,d3,d4] }
    .toPairs()
    // [ [f1,[d1,d2,d3]], [f2,[d2,d3,d4]] ]
    .map(([file, dep]) => [dep, lodash.times(dep.length, () => file)])
    // [ [ [d1,d2,d3],[f1,f1,f1] ], [ [d2,d3,d4],[f2,f2,f2] ] ]
    .map((pairs) => lodash.zip(...pairs))
    // [ [ [d1,f1],[d2,f1],[d3,f1] ], [ [d2,f2],[d3,f2],[d4,f2]] ]
    .flatten()
    // [ [d1,f1], [d2,f1], [d3,f1], [d2,f2], [d3,f2], [d4,f2] ]
    .groupBy(([dep]) => dep)
    // { d1:[ [d1,f1] ], d2:[ [d2,f1],[d2,f2] ], d3:[ [d3,f1],[d3,f2] ], d4:[ [d4,f2] ] }
    .mapValues((pairs) => pairs.map(lodash.last))
    // { d1:[ f1 ], d2:[ f1,f2 ], d3:[ f1,f2 ], d4:[ f2 ] }
    .value();

  const usingDeps = Object.keys(usingDepsLookup);

  const missingDepsLookup = skipMissing
    ? []
    : (() => {
        const allDeps = deps
          .concat(devDeps)
          .concat(peerDeps)
          .concat(optionalDeps);

        const missingDeps = lodash.difference(usingDeps, allDeps);
        return lodash(missingDeps)
          .map((missingDep) => [missingDep, usingDepsLookup[missingDep]])
          .fromPairs()
          .value();
      })();

  return {
    dependencies: lodash.difference(deps, usingDeps),
    devDependencies: lodash.difference(devDeps, usingDeps),
    missing: missingDepsLookup,
    using: usingDepsLookup,
    invalidFiles: result.invalidFiles,
    invalidDirs: result.invalidDirs,
  };
}
