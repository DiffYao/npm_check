const CFG = require('../cfg/cfg_builder').CFG;
const lint = require('../cfg/cfg_builder').lint;
const fs = require('fs');
const espree = require('espree');
const { generate } = require('astring');
const SourceCode = require('eslint').SourceCode

const code = fs.readFileSync("./easy_app/index3.js", 'utf-8');

const ast = espree.parse(code, {
	range: true,
	loc: true,
	comment: true,
	tokens: true,
	ecmaVersion: 2022,
	sourceType: "module",
	ecmaFeatures: {
		jsx: true,
		globalReturn: true,
		impliedStrict: true,
	},
});


// console.log(lint(sourceCode));
let cfg = new CFG(new SourceCode(code, ast));
cfg.Build();

// console.log(cfg.codePaths[0].getObject().initialSegment.Nodes);
// console.log(cfg.getCodePaths())
// console.log(cfg.getCodePaths()[0].getObject())

// console.log(generate(espree.parse(code)))
// console.log(typeof generate)
cfg.DumpDot().forEach((dot, index) => {
  // console.log(dot);
  fs.writeFileSync(`./output/dot/${index}.dot`, dot, 'utf-8');
})

// console.log(cfg.getCodePaths()[0].getObject().initialSegment.allNextSegments[0].nextSegments[0].nextSegments[0]);

// console.log(cfg.getUnreachableNode());




