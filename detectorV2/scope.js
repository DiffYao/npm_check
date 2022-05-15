const eslintScope = require("eslint-scope");
const evk = require("eslint-visitor-keys");
const espree = require("espree");
const estraverse = require("estraverse");
const ast = require("../util/parser");
const fs = require("fs");
const lodash = require("lodash");
const novar = require("./no-unused-vars");
const parser = require("../parser/espree_parser");

var detectors = [
	require("../detector/requireCallExpression"),
	require("../detector/importCallExpression"),
	require("../detector/importDeclaration"),
];

async function check() {
	let astTree = await parser(
		"/Users/diffyao/Code/node_learn/npm_check/easy_app/index3.js"
	);

	console.log(astTree);
	const scopeManager = eslintScope.analyze(astTree, {
		optimistic: true,
		ignoreEval: true,
		nodejsScope: true,
		ecmaVersion: 7,
		sourceType: "model",
		childVisitorKeys: evk.KEYS,
		fallback: evk.getKeys,
	});

	let vars = scopeManager.getDeclaredVariables(astTree);
	
	let resList = novar.collectUnusedVariables(scopeManager.globalScope, []);

	console.log(resList);
}

// check()

async function trace2() {
	let astTree = await parser(
		"/Users/diffyao/Code/node_learn/npm_check/easy_app/index3.js"
	);

  const scopeManager = eslintScope.analyze(astTree, {
		optimistic: true,
		ignoreEval: true,
		nodejsScope: true,
		ecmaVersion: 7,
		sourceType: "model",
		childVisitorKeys: evk.KEYS,
		fallback: evk.getKeys,
	});
  
	let a = 0;
  let unusedDep = [
  ]
	estraverse.traverse(astTree, {
		enter(node, parent) {
			if (
				node.type === "CallExpression" &&
				node.callee &&
				node.callee.type === "Identifier" && 
        node.callee.name === "require"
			) {
				a = a + 1;
        switch (parent.type) {
          case "VariableDeclarator" || "VariableDeclarator":
            let isUsed = false;
            let vars = scopeManager.getDeclaredVariables(parent).forEach((v) => {
              console.log(v)
              if (novar.isUsedVariable(v)) {
                isUsed = true;
              }
              if (isUsed) {
                unusedDep.push({
                  "depName" : node.arguments[0].value,
                  "node" : node
                })
              }
            });
            
          default:
            // console.log(parent.type)
            break;
        }

			}
		},
		leave(node, parent) {
			// do stuff
		},
	});

  console.log(unusedDep);
	// console.log(a);
}

check();
// trace2();

// resList.filter(item => {
//   console.log(item.defs[0].node);
//   usingDep = lodash(ast.getNodes(result))
//   .map((node) => detect(detectors, node, deps))
//   .flatten()
//   .uniq()
//   .map(requirePackageName) // 获取dep实际的名字
//   .filter((pkg) => !isCoreModule(pkg)) // 去除系统自带依赖
//   .filter((dep) => dep && dep !== "." && dep !== "..") // 去除本地依赖
//   .value();
//   return true;
// })
