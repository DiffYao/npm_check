const lodash = require("lodash");
const AST = require("./analyser/ast_analyse");
const CFG = require("./analyser/cfg_analyse");
const DFG = require("./analyser/dfa_analyse");

exports.getDependence = async function (filename) {
	// ast 分析的结果
	let astAnalyseRes = await AST.analyse(filename);
	if (astAnalyseRes.error) {
		return {
			invalidFiles: {
				[filename]: astAnalyseRes.error,
			},
		};
	}
	// 构建cfg
	let cfgAnalyseRes = CFG.analyse(astAnalyseRes);

	// console.log(analyseRes);
	// console.log(lodash(cfgAnalyseRes).map('name').value());
	let usingDep = lodash(DFG.analyse(cfgAnalyseRes)).map("name").value();
	// console.log(usingDep);

	// console.log(filename + "   " + usingDep);

	return {
		using: {
			[filename]: usingDep,
		},
		trulyUsing: {
			[filename]: [],
		},
	};
};
