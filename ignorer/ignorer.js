const ignore = require("ignore");
const path = require("path");
const fs = require('fs')

var ignorePatterns = [
  ".git",
  ".svn",
  ".hg",
  ".idea",
  "node_modules",
  "bower_components",
  // Images
  "*.png",
  "*.gif",
  "*.jpg",
  "*.jpeg",
  "*.svg",
  // Fonts
  "*.woff",
  "*.woff2",
  "*.eot",
  "*.ttf",
  // Archives
  "*.zip",
  "*.gz",
  // Videos
  "*.mp4",
  // package.json
  "package.json",
  "package-lock.json"
];

exports.Init = function (rootDir) {
  const ignorer = ignore();
  ignorer.add(ignorePatterns);

  // Fallback on .depcheckignore or .gitignore
  const ignoreFile = [".depcheckignore", ".gitignore"]
    .map((file) => path.resolve(rootDir, file))
    .find((file) => fs.existsSync(file));

  if (ignoreFile) {
    debug("depcheck:ignorer")(`Using ${ignoreFile} as ignore file.`);
    const ignoreContent = fs.readFileSync(ignoreFile, "utf8");
    ignorer.add(ignoreContent);
  }

  return ignorer;
};
