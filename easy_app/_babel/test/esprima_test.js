function My() {
    var name
    this.SetName = function (newName) {
        name = newName;
    };
    this.SayHello = function () {
        console.log('hello ' + name)
    }
};


module.exports = My;
