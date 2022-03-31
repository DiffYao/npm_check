const fs = require('fs');
const path = require('path');
const checkMain = require('./main')

function checkPathExist(dir, errorMessage) {
    return new Promise((resolve, reject) =>
      fs.exists(dir, (result) => (result ? resolve() : reject(errorMessage))),
    );
  }

async function cli() {
  try {
    const dir = process.argv.slice(2)[0];
    const rootDir = path.resolve(dir);
    await checkPathExist(rootDir, `Path ${dir} does not exist`);
    await checkPathExist(
      path.resolve(rootDir, "package.json"),
      `Path ${dir} does not contain a package.json file`
    );
    checkMain(rootDir)
  } catch (err) {
    console.error(err);
    process.exitCode = -1;
  }
}

cli();
