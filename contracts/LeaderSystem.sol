pragma solidity ^0.4.24;

import "./Math.sol";
import "./SafeMath.sol";

contract LeaderSystem {
    using SafeMath for uint256;

    event NewLeader(uint256 _indexTable, address _addr, uint256 _index, uint256 _sum);
    event LeadersClear(uint256 _indexTable);

    uint8 public constant leadersCount = 7;
    mapping (uint8 => uint256) public leaderBonuses;

    struct LeadersTable {
        uint256 timestampEnd;              // timestamp of closing table
        uint256 duration;                   // duration compute
        uint256 minSum;                     // min sum of leaders
        address[] leaders;                  // leaders array
        mapping (address => uint256) users; // sum all users
    }

    LeadersTable[] public leaders;

    function setupLeaderSystemModule() internal {
        leaderBonuses[0] = 10;  // 10%
        leaderBonuses[1] = 7;   // 7%
        leaderBonuses[2] = 5;   // 5%
        leaderBonuses[3] = 3;   // 3%
        leaderBonuses[4] = 1;   // 1%
        leaderBonuses[5] = 0;   // 0%
        leaderBonuses[6] = 0;   // 0%

        leaders.push(LeadersTable(now + 86400, 86400, 0, new address[](0)));
        leaders.push(LeadersTable(now + 604800, 604800, 0, new address[](0)));
        leaders.push(LeadersTable(now + 77760000, 77760000, 0, new address[](0)));
        leaders.push(LeadersTable(now + 31536000, 31536000, 0, new address[](0)));
    }

    function _clearLeadersTable(uint256 _indexTable) internal {
        LeadersTable storage _leader = leaders[_indexTable];
        leaders[_indexTable] = LeadersTable(_leader.timestampEnd + _leader.duration, _leader.duration, 0, new address[](0));

        emit LeadersClear(_indexTable);
    }

    function quickSort(LeadersTable storage leader, int left, int right) internal {
        int i = left;
        int j = right;
        if (i == j) return;
        uint pivot = leader.users[leader.leaders[uint(left + (right - left) / 2)]];
        while (i <= j) {
            while (leader.users[leader.leaders[uint(i)]] > pivot) i++;
            while (pivot > leader.users[leader.leaders[uint(j)]]) j--;
            if (i <= j) {
                (leader.leaders[uint(i)], leader.leaders[uint(j)]) = (leader.leaders[uint(j)], leader.leaders[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickSort(leader, left, j);
        if (i < right)
            quickSort(leader, i, right);
    }

    function _updateLeadersTable(uint256 i, address _addr, uint256 _value) internal {
        if (now > leaders[i].timestampEnd) _clearLeadersTable(i);

        LeadersTable storage leader = leaders[i];
        bool isExist = leader.users[_addr] >= leader.minSum;

        uint256 oldSum = leader.users[_addr];
        uint256 newSum = oldSum.add(_value);
        leader.users[_addr] = newSum;

        if (newSum < leader.minSum && leader.leaders.length == leadersCount) return;

        if (!isExist || leader.leaders.length == 0) leader.leaders.push(_addr);

        if (leader.leaders.length > 1) quickSort(leader, 0, int256(leader.leaders.length - 1));
        if (leader.leaders.length > leadersCount) {
            delete leader.leaders[leadersCount - 1];
        }

        leader.minSum = leader.users[leader.leaders[leader.leaders.length - 1]];
    }

    function _updateLeaders(address _addr, uint256 _value) internal {
        for (uint i = 0; i < leaders.length; i++) {
            _updateLeadersTable(i, _addr, _value);
        }
    }

    function getLeadersTableInfo(uint256 _indexTable) public view returns(uint256, uint256, uint256) {
        return (leaders[_indexTable].timestampEnd, leaders[_indexTable].duration, leaders[_indexTable].minSum);
    }

    function getLeaders(uint256 _indexTable) public view returns(address[], uint256[]) {
        LeadersTable storage leader = leaders[_indexTable];
        uint256[] memory balances = new uint256[](leader.leaders.length);

        for (uint i = 0; i < leader.leaders.length; i++) {
            balances[i] = leader.users[leader.leaders[i]];
        }

        return (leader.leaders, balances);
    }

}