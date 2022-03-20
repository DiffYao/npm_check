var parser = require('./parser/jsx')
var lodash = require('lodash')
var ast = require('./util/parser')
var requirePackageName = require('require-package-name')

exports.getDependencies = async function (filename, dir, deps, detectors) {
  const result = await parser.parse(filename);
  // console.log(result)
  // when parser returns string array, skip detector step and treat them as dependencies.
  console.log(lodash.isArray(result) && result.every(lodash.isString))
  const dependencies =
    lodash.isArray(result) && result.every(lodash.isString)
      ? result
      : lodash(ast.getNodes(result))
        .map((node) => detect(detectors, node, deps))
        .flatten()
        .uniq()
        .map(requirePackageName)
        .thru((_dependencies) =>
          // parser === availableParsers.typescript
          true ? // If this is a typescript file, importing foo would also use @types/foo, but
            // only if @types/foo is already a specified dependency.
            lodash(_dependencies)
              .map((dependency) => {
                const atTypesName = getAtTypesName(dependency);
                return deps.includes(atTypesName)
                  ? [dependency, atTypesName]
                  : [dependency];
              })
              .flatten()
              .value()
            : _dependencies,
        )
        .value();

  const discover = lodash.partial(discoverPropertyDep, dir, deps);
  const discoverPeerDeps = lodash.partial(discover, 'peerDependencies');
  const discoverOptionalDeps = lodash.partial(discover, 'optionalDependencies');
  const peerDeps = lodash(dependencies).map(discoverPeerDeps).flatten().value();
  const optionalDeps = lodash(dependencies)
    .map(discoverOptionalDeps)
    .flatten()
    .value();

  return lodash(dependencies)
    .concat(peerDeps)
    .concat(optionalDeps)
    .filter((dep) => dep && dep !== '.' && dep !== '..') // TODO why need check?
    .filter((dep) => !isCore(dep))
    .uniq()
    .value();
}

function detect(detector, node, deps) {
  try {
    return detector(node, deps);
  } catch (error) {
    return [];
  }
}


function discoverPropertyDep(rootDir, deps, property, depName) {
  const { metadata } = loadModuleData(depName, rootDir);
  if (!metadata) return [];
  const propertyDeps = Object.keys(metadata[property] || {});
  return lodash.intersection(deps, propertyDeps);
}

function loadModuleData(moduleName, rootDir) {
  try {
    const file = require.resolve(`${moduleName}/package.json`, {
      paths: [rootDir],
    });
    return {
      path: path.dirname(file),
      metadata: readJSON(file),
    };
  } catch (error) {
    return {
      path: null,
      metadata: null,
    };
  }
}
