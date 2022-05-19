const check = require("./check");
const lodash = require("lodash");
const getDefinedPkg = require("./get_defined_pkg");

exports.check = function (rootDir) {


	// 获取定义的package
	var dep = getDefinedPkg.getDeps(rootDir);

	let deps = dep.deps;
	let devDeps = dep.devdeps;
	
	return check
		.checkProject(rootDir)
		.then((result) => buildResult(result, deps, devDeps))
		.then((res) => {
			console.log(res);
			return res;
		});
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

	const trulyUsingDepsLookup = lodash(result.trulyUsing)
		.toPairs()
		.map(([file, dep]) => [dep, lodash.times(dep.length, () => file)])
		.map((pairs) => lodash.zip(...pairs))
		.flatten()
		.groupBy(([dep]) => dep)
		.mapValues((pairs) => pairs.map(lodash.last))
		.value();

	const usingDeps = Object.keys(usingDepsLookup);
	const trulyUsingDeps = Object.keys(trulyUsingDepsLookup);

	// UsedButNotDefined
	const missingDepsLookup = (() => {
		const allDeps = lodash.union(deps, devDeps);

		const missingDeps = lodash.difference(usingDeps, allDeps);
		return lodash(missingDeps)
			.map((missingDep) => [missingDep, usingDepsLookup[missingDep]])
			.fromPairs()
			.value();
	})();

	// ImportButNotTrulyUsed
	const notTrulyUsed = (() => {
		const missingDeps = lodash.difference(usingDeps, trulyUsingDeps);
		return lodash(missingDeps)
			.map((missingDep) => [missingDep, usingDepsLookup[missingDep]])
			.fromPairs()
			.value();
	})();

	return {
		DefinedButNotUsed: lodash.difference(deps, usingDeps),
		UsedButNotDefined: missingDepsLookup,
		// Used: usingDepsLookup,
		// ImportButNotTrulyUsed: notTrulyUsed,
		InvalidFiles: result.invalidFiles,
		InvalidDirs: result.invalidDirs,
	};
}

module.exports = exports.check;
