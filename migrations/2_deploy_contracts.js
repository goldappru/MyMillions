var SafeMath = artifacts.require("./SafeMath.sol");
var Math = artifacts.require("./Math.sol");
var MyMillions = artifacts.require("./MyMillions.sol");

module.exports = function (deployer) {
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, MyMillions);
    deployer.deploy(Math);
    deployer.link(Math, MyMillions);
    deployer.deploy(MyMillions);
};
