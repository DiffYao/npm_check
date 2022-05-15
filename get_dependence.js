const lodash = require("lodash");
const ast = require("./util/parser");
const requirePackageName = require("require-package-name");
const isCoreModule = require("is-core-module");
const estraverse = require("estraverse");
const eslintScope = require("eslint-scope");
const evk = require("eslint-visitor-keys");
const novar = require("./detectorV2/no-unused-vars");

exports.getDependence = async function (filename, deps, parser, detectors) {
	const result = await parser(filename);
	if (result.error) {
		return {
			invalidFiles: {
				[filename]: result.error,
			},
		};
	}
	const astTree = result.astTree;

	let usingDep = lodash(ast.getNodes(astTree))
		.map((node) => detect(detectors, node, deps))
		.flatten()
		.uniq()
		.map(requirePackageName) // 获取dep实际的名字
		.filter((pkg) => !isCoreModule(pkg)) // 去除系统自带依赖
		.filter((dep) => dep && dep !== "." && dep !== "..") // 去除本地依赖
		.value();

	let tempDep = [];
	const scopeManager = eslintScope.analyze(astTree, {
		optimistic: true,
		ignoreEval: true,
		nodejsScope: true,
		ecmaVersion: 2022,
		sourceType: "module",
		childVisitorKeys: evk.KEYS,
		fallback: evk.getKeys,
	});

	estraverse.traverse(astTree, {
		enter(node, parent) {
			let isUsed = true;
			res = detect(detectors, node, deps);
			if (res.length == 0) {
				return;
			}

			if (["VariableDeclaration", "VariableDeclarator"].includes(parent.type)) {
				isUsed = false;
				scopeManager.getDeclaredVariables(parent).forEach((v) => {
					if (novar.isUsedVariable(v)) {
						isUsed = true;
					}
				});
			} else if (node.type == "ImportDeclaration") {
				isUsed = false;
				scopeManager.getDeclaredVariables(node).forEach((v) => {
					if (novar.isUsedVariable(v)) {
						isUsed = true;
					}
				});
			}

			// check is truly used
			if (isUsed) {
				tempDep.push({
					dep: requirePackageName(res[0]), // 获取dep实际的名字
					node: node,
				});
			}
		},
		leave(node, parent) {
			// do stuff
		},
	});

	let truelyUsingDep = lodash(tempDep)
		.filter((item) => item)
		.flatten()
		.uniqBy("dep")
		.filter((item) => !isCoreModule(item.dep)) // 去除系统自带依赖
		.filter((item) => item.dep && item.dep !== "." && item.dep !== "..") // 去除本地依赖
		.value();

	let usingDepName = lodash(truelyUsingDep).map("dep").value();

	return {
		using: {
			[filename]: usingDep,
		},
		trulyUsing: {
			[filename]: usingDepName,
		},
	};
};

function detect(detectors, node, deps) {
	return lodash(detectors)
		.map((detector) => {
			try {
				return detector(node, deps);
			} catch (error) {
				console.log(error);
				return {};
			}
		})
		.flatten()
		.value();
}
