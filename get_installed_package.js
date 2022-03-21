const _ = require('lodash');
const globby = require('globby');
const readPackageJson = require('./read_package_json');
const path = require('path');

module.exports = function (cwd) {
    const GLOBBY_PACKAGE_JSON = '{*/package.json, @*/*/package.json}';
    const installedPackages = globby.sync(GLOBBY_PACKAGE_JSON, {cwd: cwd});

    console.log(globby.sync("/Users/diffyao/Code/node_learn/npm_check/*package.json"))
    return _(installedPackages)
        .map(pkgPath => {
            const pkg = readPackageJson(path.resolve(cwd, pkgPath));
            return [pkg.name, pkg.version];
        })
        .fromPairs()
        .valueOf();
};