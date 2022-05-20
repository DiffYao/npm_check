rootDir = "/Users/diffyao/Code/node_learn/depcheck/test/fake_modules/missing_nested"

const ignorer = require("../ignorer/ignorer").Init(rootDir);
const readdirp = require('readdirp');
const path = require('path');

// 获取所有待处理文件，过滤一些无用文件
const finder = readdirp(rootDir, {
  fileFilter: ["*.js", "*.mjs", "*.cjs"],
  directoryFilter: (entry) => {
    console.log("directoryFilter");
    console.log(entry);
    console.log(isModule(entry.fullPath));
    return false;
    // console.log(!isModule(entry.fullPath));
    // return !ignorer.ignores(entry.path) && !isModule(entry.fullPath)
  }
});

finder.on("data", (entry) => {
  console.log("data: ");
  console.log(entry)
});


finder.on("error", (entry) => {
  console.log("error" + entry);
});

function isModule(dir) {
	try {
		require(path.resolve(dir, "package.json"));
		return true;
	} catch (error) {
		return false;
	}
}