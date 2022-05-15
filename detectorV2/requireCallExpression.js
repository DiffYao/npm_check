exports.default = function (node) {
	res = {
		DeclareDep: {},
		DeleteDep: {},
		UsedDep: {}
	};
	if (
		node.type === "VariableDeclarator" &&
		node.init &&
		node.init &&
		node.init.type === "CallExpression" &&
		node.init.callee &&
		node.init.callee.type === "Identifier" &&
		node.init.callee.name === "require" &&
		node.init.arguments.length === 1
	) {
		if (
			node.init.arguments[0].type === "Literal" ||
			node.init.arguments[0].type === "StringLiteral"
		) {
			if (typeof node.init.arguments[0].value === "string") {
				res.DeclareDep[node.id.name] = node.init.arguments[0].value;
				return res;
			}
		}
	}
	return res;
};
module.exports = exports.default;


context = {
	DeclareDep: {},
	DeleteDep: {},
	UsedDep: {}
}