var espree = require("espree");
var file = require("../util/file");

const shebangPattern = /^#!([^\r\n]+)/u;

exports.default = async function (filename) {
	const content = await file.getContent(filename);
	const textToParse = stripUnicodeBOM(content).replace(
		shebangPattern,
		(match, captured) => `//${captured}`
	);
	try {
		return {
			astTree: espree.parse(textToParse, {
				range: true,
				loc: true,
				comment: true,
				tokens: true,
				ecmaVersion: 2019,
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
					globalReturn: true,
					impliedStrict: true,
				},
			}),
			code: content,
			filename: filename,
			error: null,
		};
	} catch (error) {
		// console.log(error);
		// console.log(filename);
		return {
			error: error,
		};
	}
};

/**
 * Strips Unicode BOM from a given text.
 * @param {string} text A text to strip.
 * @returns {string} The stripped text.
 */
function stripUnicodeBOM(text) {
	/*
	 * Check Unicode BOM.
	 * In JavaScript, string data is stored as UTF-16, so BOM is 0xFEFF.
	 * http://www.ecma-international.org/ecma-262/6.0/#sec-unicode-format-control-characters
	 */
	if (text.charCodeAt(0) === 0xfeff) {
		return text.slice(1);
	}
	return text;
}

module.exports = exports.default;
