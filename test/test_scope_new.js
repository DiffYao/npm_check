const AST = require("../analyser/ast_analyse");
const CFG = require("../analyser/cfg_analyse");
const DFG = require("../analyser/dfa_analyse");
// const eslintScope = require("./scope/index");
const eslintScope = require("eslint-scope");
const evk = require("eslint-visitor-keys");
const fs = require('fs');
const novar = require('../detectorV2/no-unused-vars');

async function test() {
	filename = "/Users/diffyao/Code/node_learn/npm_check/easy_app/index9.js";

	let astAnalyseRes = await AST.analyse(filename);

	// 构建cfg
	let cfgAnalyseRes = CFG.analyse(astAnalyseRes);

	const scopeManager = eslintScope.analyze(cfgAnalyseRes.ast, {
		optimistic: true,
		ignoreEval: true,
		nodejsScope: true,
		ecmaVersion: 2022,
		sourceType: "module",
		childVisitorKeys: evk.KEYS,
		fallback: evk.getKeys,
	});


	console.log(scopeManager.scopes.length);

	// console.log(scopeManager.globalScope);
	// console.log(evk.KEYS);



	// console.log(scopeManager);

	// cfgAnalyseRes.cfg.DumpDot()
	// cfgAnalyseRes.cfg.codePaths.forEach((codePath) => {
	// 	console.log(codePath.getObject());
	// });
	
	// cfgAnalyseRes.cfg.DumpDot().forEach((dot, index) => {
	// 	// console.log(dot);
	// 	fs.writeFileSync(`./cfg/dot/${index}.dot`, dot, 'utf-8');
	// })

  // console.log(cfgAnalyseRes.importDepInfo);
  // scopeManager.scopes.forEach((scope) => {
  //   console.log(1);
  // })

  // let vars = scopeManager.getDeclaredVariables(cfgAnalyseRes.importDepInfo[0].parent);
  // // console.log(vars[0].references);
	// /// console.log(vars[0].references);
  // // console.log(vars[0].references);
  // if (novar.isUsedVariable(vars[0])) {
  //   console.log(22)
  // }

	// a = 1;
	// vars[0].references.forEach(element => {
	// 	console.log(a++)
	// 	console.log(element.identifier);
	// });

}

test();