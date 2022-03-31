var lodash = require("lodash");
var path = require("path");

// done
// 获取在package.json中声明定义的pkg
exports.getDeps = function getAllDeps(rootDir) {
    const metadata = require(path.join(rootDir, "package.json"));
    const dependencies = metadata.dependencies || {};
    const devDependencies = metadata.devDependencies
        ? metadata.devDependencies
        : {};

    const dep = lodash(dependencies).keys().value();
    const devp = lodash(devDependencies).keys().value();
    const allDeps = lodash.union(dep, devp);

    return {
        deps: dep,
        devdeps: devp,
        alldeps: allDeps,
    };
};
