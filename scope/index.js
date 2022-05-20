const assert = require("assert");

const ScopeManager = require("./scope-manager.js").default;
const Referencer = require("./referencer.js").default;
const Reference = require("./reference.js").default;
const Variable = require("./variable.js").Variable;

/**
 * Set the default options
 * @returns {Object} options
 */
function defaultOptions() {
	return {
		optimistic: false,
		directive: false,
		nodejsScope: false,
		impliedStrict: false,
		sourceType: "script", // one of ['script', 'module', 'commonjs']
		ecmaVersion: 5,
		childVisitorKeys: null,
		fallback: "iteration",
	};
}

/**
 * Preform deep update on option object
 * @param {Object} target Options
 * @param {Object} override Updates
 * @returns {Object} Updated options
 */
function updateDeeply(target, override) {
	/**
	 * Is hash object
	 * @param {Object} value Test value
	 * @returns {boolean} Result
	 */
	function isHashObject(value) {
		return (
			typeof value === "object" &&
			value instanceof Object &&
			!(value instanceof Array) &&
			!(value instanceof RegExp)
		);
	}

	for (const key in override) {
		if (Object.prototype.hasOwnProperty.call(override, key)) {
			const val = override[key];

			if (isHashObject(val)) {
				if (isHashObject(target[key])) {
					updateDeeply(target[key], val);
				} else {
					target[key] = updateDeeply({}, val);
				}
			} else {
				target[key] = val;
			}
		}
	}
	return target;
}

/**
 * Main interface function. Takes an Espree syntax tree and returns the
 * analyzed scopes.
 * @function analyze
 * @param {espree.Tree} tree Abstract Syntax Tree
 * @param {Object} providedOptions Options that tailor the scope analysis
 * @param {boolean} [providedOptions.optimistic=false] the optimistic flag
 * @param {boolean} [providedOptions.directive=false] the directive flag
 * @param {boolean} [providedOptions.ignoreEval=false] whether to check 'eval()' calls
 * @param {boolean} [providedOptions.nodejsScope=false] whether the whole
 * script is executed under node.js environment. When enabled, escope adds
 * a function scope immediately following the global scope.
 * @param {boolean} [providedOptions.impliedStrict=false] implied strict mode
 * (if ecmaVersion >= 5).
 * @param {string} [providedOptions.sourceType='script'] the source type of the script. one of 'script', 'module', and 'commonjs'
 * @param {number} [providedOptions.ecmaVersion=5] which ECMAScript version is considered
 * @param {Object} [providedOptions.childVisitorKeys=null] Additional known visitor keys. See [esrecurse](https://github.com/estools/esrecurse)'s the `childVisitorKeys` option.
 * @param {string} [providedOptions.fallback='iteration'] A kind of the fallback in order to encounter with unknown node. See [esrecurse](https://github.com/estools/esrecurse)'s the `fallback` option.
 * @returns {ScopeManager} ScopeManager
 */
function analyze(cfgRes, providedOptions) {
	const options = updateDeeply(defaultOptions(), providedOptions);
	const scopeManager = new ScopeManager(options);
	const referencer = new Referencer(options, scopeManager);

	// let cfg = cfgRes.cfg.getCodePaths().forEach(codePath => {
	// traverse 都是可以抵达的节点
	cfgRes.cfg.getCodePaths()[0].traverseSegmentsTrue(function (segment) {
		// console.log(segment.id);
		segment.Nodes.forEach((nodeMap) => {
			if (!segment.reachable && !nodeMap.str.endsWith("exit")) {
				return;
			}
			// console.log(nodeMap)
			referencer.VisitNodeMap(nodeMap);
			// console.log(type);
		});
	});

	// referencer.visit(cfg);

	// console.log(scopeManager.__currentScope.block);
	assert(scopeManager.__currentScope === null, "currentScope should be null.");

	return scopeManager;
}

module.exports = {
	/** @name module:escope.Reference */
	Reference,

	/** @name module:escope.Variable */
	Variable,

	/** @name module:escope.ScopeManager */
	ScopeManager,

	/** @name module:escope.Referencer */
	Referencer,

	analyze,
};

/** @name module:escope.Definition */
exports.Definition = require("./definition.js").Definition;

/** @name module:escope.PatternVisitor */
exports.PatternVisitor = require("./pattern-visitor.js");

/** @name module:escope.Scope */
exports.Scope = require("./scope.js");

/* vim: set sw=4 ts=4 et tw=80 : */
