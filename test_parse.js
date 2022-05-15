const parser = require("./parser/espree_parser");
const eslintScope = require("eslint-scope");
const evk = require("eslint-visitor-keys");
const espree = require("espree");
const fs = require("fs");

async function pa() {
	fileName = "/Users/diffyao/Desktop/test_projects/npm-name-main/index.js"
	let code = fs.readFileSync(
		fileName,
		"utf8"
	);

	// let astTree = espree.parse(code, {
	// 	range: true,
	// 	ecmaVersion: 2022,
	// 	sourceType: "module",
	// });

	let astTree = await parser(fileName)

	const scopeManager = eslintScope.analyze(
		astTree,
		{
			ecmaVersion: 2022,
			sourceType: "module",
		}
	);
	console.log(scopeManager.getDeclaredVariables(astTree.body[0]))

}

pa();
