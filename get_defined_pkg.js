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
    const optionDep = metadata.optionalDependencies || {};    
    const peerDep = metadata.peerDependencies || {};

    const dep = lodash(dependencies).keys().value();
    const devp = lodash(devDependencies).keys().value();
    const optionDeps = lodash(optionDep).keys().value();
    const peerDeps = lodash(peerDep).keys().value();

    const allDeps = lodash.union(dep, devp, optionDeps, peerDeps);

    return {
        deps: dep,
        devdeps: devp,
        optionDeps: optionDeps,
        alldeps: allDeps,
    };
};
