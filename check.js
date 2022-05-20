const readdirp = require("readdirp");
const check = require("./get_dependence");
const lodash = require("lodash");

exports.checkProject = function (rootDir) {
	return new Promise((resolve) => {
		const ignorer = require("./ignorer/ignorer").Init(rootDir);
		
		// 获取所有待处理文件，过滤一些无用文件
		const finder = readdirp(rootDir, {
			fileFilter: ["*.js", "*.mjs", "*.js"],
			directoryFilter: (entry) =>
				!ignorer.ignores(entry.path) && !isModule(entry.fullPath),
		});

		const promiseList = [];

		finder.on("data", (entry) => {
			promiseList.push(
				check.getDependence(entry.fullPath)
			);
		});

		finder.on("warn", (error) => {
			promiseList.push(
				Promise.resolve({
					invalidDirs: {
						[error.path]: error,
					},
				})
			);
		});

		finder.on("end", () => {
			resolve(
				Promise.all(promiseList).then((results) =>
					results.reduce(
						(obj, current) => ({
							using: mergeBuckets(obj.using, current.using || {}),
							invalidFiles: Object.assign(
								obj.invalidFiles,
								current.invalidFiles
							),
							invalidDirs: Object.assign(obj.invalidDirs, current.invalidDirs),
						}),
						{
							using: {},
							invalidFiles: {},
							invalidDirs: {},
						}
					)
				)
			);
		});
	});
};

function isModule(dir) {
	try {
		readJSON(path.resolve(dir, "package.json"));
		return true;
	} catch (error) {
		return false;
	}
}

function mergeBuckets(object1, object2) {
	return lodash.mergeWith(object1, object2, (value1, value2) => {
		const array1 = value1 || [];
		const array2 = value2 || [];
		return array1.concat(array2);
	});
}
