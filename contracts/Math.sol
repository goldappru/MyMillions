pragma solidity ^0.4.24;

library Math {
    function max(uint a, uint b) returns (uint) {
        if (a > b) return a;
        else return b;
    }
    function min(uint a, uint b) returns (uint) {
        if (a < b) return a;
        else return b;
    }
}
