const eslintScope = require("eslint-scope");
const evk = require("eslint-visitor-keys");
const novar = require("../detectorV2/no-unused-vars");
const lodash = require("lodash");

function analyse(analyseRes) {
	const scopeManager = eslintScope.analyze(analyseRes.ast, {
		optimistic: true,
		ignoreEval: true,
		nodejsScope: true,
		ecmaVersion: 2022,
		sourceType: "module",
		childVisitorKeys: evk.KEYS,
		fallback: evk.getKeys,
	});

	// 遍历依赖节点
	let newImportDepInfo = lodash(analyseRes.importDepInfo).filter((item) => {
		let isUsed = true;
    let parent = item.node.parent;
    let node = item.node;
		if (!parent) {
			return isUsed;
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
    return isUsed;
	}).value();

  return newImportDepInfo;
}

exports.analyse = analyse;
