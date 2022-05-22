const parser = require("../parser/espree_parser");
const estraverse = require("estraverse");
const requirePackageName = require("require-package-name");
const lodash = require("lodash");
const isCoreModule = require("is-core-module");
const detectors = [
	require("../detector/requireCallExpression"),
	require("../detector/importCallExpression"),
	require("../detector/importDeclaration"),
	require("../detector/requireResolveCallExpression"),
	require("../detector/exportDeclaration"),
];

exports.func = async function (filename) {
	let importDepInfo = [];

	let astTreeRes = await parser(filename);
	if (astTreeRes.error) {
		console.log(astTreeRes.error);
		return {
			error: astTreeRes.error,
		};
	}
	let ast = astTreeRes.astTree;

	estraverse.traverse(ast, {
		enter(node, parent) {
			let detectRes = detect(detectors, node);
			if (detectRes.length == 0) {
				return;
			}

			detectRes.forEach((res) => {
				importDepInfo.push({
					name: requirePackageName(res),
					node: node,
					parent: parent,
					start_position: node.loc.start,
					end_position: node.loc.end,
				});
			});
		},
	});

	// 对检测结果进行过滤
	let importDepInfoNew = lodash(importDepInfo)
		.filter((item) => item)
		.flatten()
		.uniqBy("name") // 去重
		.filter((item) => !isCoreModule(item.name)) // 去除系统自带依赖
		.filter(
			(item) =>
				item.name && 
				lodash.isString(item.name) && 
				!item.name.startsWith(".")    // 去除本地依赖
		) 
		.value();

	return {
		ast: ast,
		code: astTreeRes.code,
		filename: astTreeRes.filename,
		importDepInfo: importDepInfoNew,
	};
};

function detect(detectors, node) {
	return lodash(detectors)
		.map((detector) => {
			try {
				return detector(node);
			} catch (error) {
				console.log(error);
				return {};
			}
		})
		.flatten()
		.value();
}

exports.analyse = exports.func;
