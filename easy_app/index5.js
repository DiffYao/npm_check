function loadClass(className) {
  // This uses a switch for static require analysis
  switch (className) {
    case 'Connection':
      Class = require('./lib/Connection');
      break;
    default:
      throw new Error('Cannot find class \'' + className + '\'');
  }

  // Store to prevent invoking require()
  Classes[className] = Class;

  return Classes;
}