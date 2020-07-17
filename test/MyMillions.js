const BigNumber = web3.BigNumber;
const expect = require('chai').expect;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

import expectThrow from './helpers/expectThrow';

var MyMillions = artifacts.require('./MyMillions.sol');
var MyMillions = artifacts.require('./MyMillions.sol');

const minute = 60;
const hour = 60 * minute;
const setNextBlockDelay = function(duration) {
    const id = Date.now()

    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 => {
            if (err1) return reject(err1)

            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: id+1,
            }, (err2, res) => {
                return err2 ? reject(err2) : resolve(res)
            })
        })
    })
}


function getUser(user) {
    if (user == undefined)
        return undefined;

    return {
        addr: user[0],
        balance: user[1].toNumber(),
        totalPay: user[2].toNumber(),
        referrersReceived: user[3].toNumber(),
        resources: user[4].map(x => x.toNumber()),
        referrers: user[5].map(x => x.toNumber())
    }
}

function getFactory(factory) {
    if (factory == undefined)
        return undefined;

    return {
        ftype: factory[0].toNumber(),
        level: factory[1].toNumber(),
        collected_at: factory[2].toNumber()
    }
}

function getLeadersTable(table) {
    if (table == undefined)
        return undefined;

    return {
        timestampEnd: table[0].toNumber(),
        duration: table[1].toNumber(),
        minSum: table[2].toNumber()
    }
}

contract('MyMillions', function(accounts) {
    let myMillions;

    const owner = accounts[0];
    const user0 = accounts[1];
    const user1 = accounts[2];
    const user2 = accounts[3];
    const user3 = accounts[4];
    const user4 = accounts[5];
    const user5 = accounts[6];
    const user6 = accounts[7];

    const gasPrice = web3.toWei('15', 'gwei');

    beforeEach('setup contract for each test', async function () {
        myMillions = await MyMillions.new({from: owner});
        await myMillions.setup({from: owner});
    });

    it('has an owner', async function () {
        expect(await myMillions.owner()).to.equal(owner);
    });

    it('register users', async function () {
        // register user with index 1
        let user0_id = 1;
        await myMillions.register({from: user0});

        let user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.addr).to.equal(user0);

        // register user with index 2
        let user1_id = 2;
        await myMillions.register({from: user1});

        let user1_info = getUser(await myMillions.userInfo(user1_id));
        expect(user1_info.addr).to.equal(user1);
    });

    it('register users again', async function () {
        // register user
        let user0_id = 1;
        await myMillions.register({from: user0});

        // register user again
        await expectThrow(myMillions.register({from: user0}));
    });

    it('register users with ref id for all levels', async function () {
        // register user with index 1
        let user0_id = 1;
        await myMillions.register({from: user0});

        // register users for all levels referrals
        let levels_count = (await myMillions.referralLevelsCount()).toNumber();
        for (var i = 1; i <= levels_count; i++) {
            await myMillions.registerWithRefID(i, {from: accounts[i + 1]});
        }

        // check all levels referrers
        let last_user_referrers = (await myMillions.referrersOf({from: accounts[levels_count]})).map(x => x.toNumber());
        for (var i = 0; i < levels_count; i++) {
            expect(last_user_referrers[i]).to.equal(levels_count - i - 1);
        }

        // check all levels referrals
        for (var i = 0; i < levels_count; i++) {
            let referrals = (await myMillions.referralsOf(i, {from: accounts[1]})).map(x => x.toNumber());
            expect(referrals[0]).to.equal(i + 2);
        }

        // check one more referral
        let user_id = levels_count + 2;
        let referrals = (await myMillions.referralsOf(levels_count - 2, {from: accounts[1]})).map(x => x.toNumber());

        // register with refId from pre-last referrals of first user
        await myMillions.registerWithRefID(referrals[0], {from: accounts[user_id]});

        // check new user
        referrals = (await myMillions.referralsOf(levels_count - 1, {from: accounts[1]})).map(x => x.toNumber());
        expect(referrals[1]).to.equal(user_id);
    });

    it('referrals distribute', async function () {
        // register user with index 1
        let user0_id = 1;
        await myMillions.register({from: user0});

        // for non-zero balance
        let sum = (await myMillions.getPrice(0, 0)).toNumber();
        await myMillions.buyFactory(0, {from: user0, value: sum});

        // register users for all levels referrals
        let users_count = 6;
        for (var i = 1; i <= users_count; i++) {
            await myMillions.registerWithRefID(i, {from: accounts[i + 1]});
        }

        // buy factory with referral distribution
        let last_user_id = users_count;
        await myMillions.buyFactory(0, {from: accounts[last_user_id], value: sum});

        let firsty_percents = (await myMillions.getReferralPercentsByIndex(0)).map(x => x.toNumber());
        let loyalty_percents = (await myMillions.getReferralPercentsByIndex(1)).map(x => x.toNumber());
        let ultraPremium_percents = (await myMillions.getReferralPercentsByIndex(2)).map(x => x.toNumber());
        let multi = 10000;

        let last_user_referrers = (await myMillions.referrersOf({from: accounts[users_count]})).map(x => x.toNumber());
    });

    it('register with initial balance', async function () {
        // register user with index 1
        let sum = 10000;
        let user0_id = 1;
        await myMillions.register({from: user0, value: sum});

        let user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.balance).to.equal(sum);
    });

    it('deposit', async function () {
        // register user with index 1
        let user0_id = 1;
        let sum = web3.toWei(1, 'ether');
        await myMillions.register({from: user0});
        await myMillions.deposit({from: user0, value: sum});

        let user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.balance.toString()).to.equal(sum);

        let leaders = await myMillions.getLeaders(0);
        let addresses = leaders[0];
        let balance = leaders[1].map(x => x.toNumber());

        expect(addresses[0]).to.equal(user0);
        expect(balance[0].toString()).to.equal(sum);
    });

    it('buy wood factory', async function () {
        let user0_id = 1;
        // get actual price for wood factory
        let sum = (await myMillions.getPrice(0, 0)).toNumber();

        // register with buy wood factory
        await myMillions.register({from: user0});
        await myMillions.buyFactory(0, {from: user0, value: sum});

        // get factory
        let factory0_id = 0;
        let factory0_info = getFactory(await myMillions.factories(factory0_id));
        assert(factory0_info != undefined);

        expect(factory0_info.ftype).to.equal(0);
        expect(factory0_info.level).to.equal(0);
        expect(factory0_info.collected_at).to.be.within(1, Math.floor(Date.now() / 1000) * 10000);
    });

    it('buy wood factory as a part 50/50', async function () {
        let user0_id = 1;
        // get actual price for wood factory
        let sum = (await myMillions.getPrice(0, 0)).toNumber();

        // register with buy wood factory
        await myMillions.register({from: user0, value: sum * 0.5});

        // buy without sum
        await expectThrow(myMillions.buyFactory(0, {from: user0}));

        await myMillions.buyFactory(0, {from: user0, value: sum * 0.5});

        // get factory
        let factory0_id = 0;
        let factory0 = await myMillions.factories(factory0_id);
        assert(factory0 != undefined);
    });

    it('buy wood factory as a part 0/100', async function () {
        let user0_id = 1;
        // get actual price for wood factory
        let sum = (await myMillions.getPrice(0, 0)).toNumber();

        // register with buy wood factory
        await myMillions.register({from: user0, value: sum});
        await myMillions.buyFactory(0, {from: user0});

        // get factory
        let factory0_id = 0;
        let factory0 = await myMillions.factories(factory0_id);
        assert(factory0 != undefined);
    });

    it('collect wood', async function () {
        let user0_id = 1;
        // get actual price for wood factory and ppm
        let sum = (await myMillions.getPrice(0, 0)).toNumber();
        let ppm = (await myMillions.getProductsPerMinute(0, 0)).toNumber() / 100;

        // register with buy wood factory
        await myMillions.register({from: user0});
        await myMillions.buyFactory(0, {from: user0, value: sum});

        // wait first minute
        await setNextBlockDelay(minute);

        // get factory
        let factory0_id = 0;

        await myMillions.collectResources({from: user0});
        var user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.resources[0]).to.equal(ppm);

        var factory0_resources = (await myMillions.resourcesAtTime(factory0_id)).toNumber();
        expect(factory0_resources).to.equal(0);

        // first minute
        await setNextBlockDelay(minute);

        // wait second minute
        await myMillions.collectResources({from: user0});
        user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.resources[0]).to.equal(2 * ppm);

        // first minute
        await setNextBlockDelay(minute);

        // wait third minute
        await myMillions.collectResources({from: user0});
        user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.resources[0]).to.equal(3 * ppm);
    });

    it('level up', async function () {
        let user0_id = 1;
        // get actual price for wood factory and ppm with bonus
        let sumLevel0 = (await myMillions.getPrice(0, 0)).toNumber();
        let sumLevel1 = (await myMillions.getPrice(0, 1)).toNumber();
        let ppmLevel0 = (await myMillions.getProductsPerMinute(0, 0)).toNumber() / 100;
        let ppmLevel1 = (await myMillions.getProductsPerMinute(0, 1)).toNumber() / 100;
        let ppmBonusLevel0 = (await myMillions.getBonusPerMinute(0, 0)).toNumber() / 100;
        let ppmBonusLevel1 = (await myMillions.getBonusPerMinute(0, 1)).toNumber() / 100;

        // register with buy wood factory
        let factory0_id = 0;
        await myMillions.register({from: user0});
        await myMillions.buyFactory(0, {from: user0, value: sumLevel0});

        await setNextBlockDelay(minute);
        await myMillions.levelUp(factory0_id, {from: user0, value: 2 * sumLevel1});

        var user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.resources[0]).to.equal(ppmLevel0 + ppmBonusLevel0);

        // check new level
        var factory0_info = getFactory(await myMillions.factories(factory0_id));
        expect(factory0_info.level).to.equal(1);

        // check collected resources in new level
        await setNextBlockDelay(minute);
        await myMillions.collectResources({from: user0});
        user0_info = getUser(await myMillions.userInfo(user0_id));

        expect(user0_info.resources[0]).to.equal(Math.round(ppmLevel0 + ppmBonusLevel0 + ppmLevel1 + ppmBonusLevel1));

        // check residual balance
        user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.balance).to.equal(sumLevel1);
    });

    it('total level up', async function () {
        let user0_id = 1;
        let levelsCount = (await myMillions.levelsCount()).toNumber()
        let factory0_id = 0;
        let factory0_type = 0;
        var totalProducts = 0;  // change to resources

        await myMillions.register({from: user0});

        for (var i = 0; i < levelsCount; i++) {
            // get actual price for wood factory and ppm with bonus
            let sum = (await myMillions.getPrice(factory0_type, i)).toNumber();
            let ppm = (await myMillions.getProductsPerMinute(factory0_type, i)).toNumber() / 100;
            let ppmBonus = (await myMillions.getBonusPerMinute(factory0_type, i)).toNumber() / 100;

            totalProducts += Math.floor(ppm + ppmBonus);

            if (i == 0) {
                await myMillions.buyFactory(factory0_type, {from: user0, value: sum});
                continue;
            }

            await setNextBlockDelay(minute);
            await myMillions.levelUp(factory0_id, {from: user0, value: sum});
        }

        await setNextBlockDelay(minute);
        await myMillions.collectResources({from: user0});

        let user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.resources[0]).to.equal(totalProducts);
    });

    it('sell wood', async function () {
        let user0_id = 1;
        // get actual price for wood factory and ppm
        let sum = (await myMillions.getPrice(0, 0)).toNumber();
        let ppm = (await myMillions.getProductsPerMinute(0, 0)).toNumber() / 100;
        let resourceSum = (await myMillions.getResourcePrice(0)).toNumber() / 100;

        // deploy new contract with enough cap
        myMillions = await MyMillions.new({from: owner, value: 2 * ppm * resourceSum});
        await myMillions.setup({from: owner});

        // register with buy wood factory
        await myMillions.register({from: user0});
        await myMillions.buyFactory(0, {from: user0, value: sum});

        // wait first minute
        await setNextBlockDelay(minute);

        let user0_balance = web3.eth.getBalance(user0).toNumber();

        // get factory
        let factory0_id = 0;

        // execute with zero gas price
        let collect_tx = await myMillions.collectResources({from: user0, gasPrice: 1});
        let sell_tx = await myMillions.sellResources(0, {from: user0, gasPrice: 1});

        // check change balance of user0
        let user0_new_balance = web3.eth.getBalance(user0).toNumber();
        let profit = user0_new_balance - user0_balance + collect_tx.receipt.cumulativeGasUsed * 2 + sell_tx.receipt.cumulativeGasUsed * 2;
        assert(profit >= resourceSum * ppm);

        // check resources of user
        let user0_info = getUser(await myMillions.userInfo(user0_id));
        expect(user0_info.resources[0]).to.equal(0);
    });

    it('leaders update', async function () {
        // register and deposit all user before tests
        let leadersCount = (await myMillions.leadersCount()).toNumber();
        let sum = web3.toWei(1, 'ether');
        for (var i = 0; i < leadersCount; i++) {
            await myMillions.register({from: accounts[i]});
            await myMillions.deposit({from: accounts[i], value: sum * (leadersCount - i)});
        }

        // check momental leaders tables
        for (var i = 0; i < 4; i++) {
            let leaders = await myMillions.getLeaders(i);
            let addresses = leaders[0];
            let balance = leaders[1].map(x => x.toNumber());

            for (var j = 0; j < addresses.length; j++) {
                expect(addresses[j]).to.equal(accounts[j]);
                expect(balance[j]).to.equal(sum * (addresses.length - j));
            }
        }
    });

    it('leaders table closing', async function () {
        let leadersTable0_info = getLeadersTable(await myMillions.getLeadersTableInfo(0));

        let sum = web3.toWei(1, 'ether');
        await myMillions.register({from: accounts[0]});
        await myMillions.register({from: accounts[1]});

        await myMillions.deposit({from: accounts[0], value: sum});

        await setNextBlockDelay(leadersTable0_info.duration + 2);
        await myMillions.deposit({from: accounts[1], value: sum});

        let leaders = await myMillions.getLeaders(0);
        let addresses = leaders[0];
        let balance = leaders[1].map(x => x.toNumber());

        expect(addresses.length).to.equal(1);
        expect(addresses[0]).to.equal(accounts[1]);
        expect(balance[0].toString()).to.equal(sum);
    });

    it('leaders simple concurrency', async function () {
        let sum0 = web3.toWei(1, 'ether');
        let sum1 = sum0 * 2;
        let sum2 = sum1 * 2;

        await myMillions.register({from: accounts[0]});
        await myMillions.register({from: accounts[1]});

        await myMillions.deposit({from: accounts[0], value: sum0});
        await myMillions.deposit({from: accounts[0], value: sum1});
        await myMillions.deposit({from: accounts[1], value: sum2});

        // check momental leaders tables
        let leaders = await myMillions.getLeaders(0);
        let addresses = leaders[0];
        let balance = leaders[1].map(x => x.toNumber());

        expect(addresses[0]).to.equal(accounts[1]);
        expect(balance[0]).to.equal(sum2);

        expect(addresses[1]).to.equal(accounts[0]);
        expect(balance[1]).to.equal(parseInt(sum0) + parseInt(sum1));

        for (var j = 2; j < addresses.length; j++) {
            expect(addresses[j]).to.equal('0x0000000000000000000000000000000000000000');
            expect(balance[j]).to.equal(0);
        }
    });

    it('leaders concurrency', async function () {
        let leadersCount = (await myMillions.leadersCount()).toNumber();
        let sums = [
            web3.toWei(1, 'ether')
        ]

        await myMillions.register({from: accounts[0]});
        for (var i = 1; i < leadersCount + 1; i++) {
            sums.push(sums[i - 1] * 2);

            await myMillions.register({from: accounts[i]});
        }

        var wins = Array.apply(null, Array(leadersCount)).map(Number.prototype.valueOf,0);

        await myMillions.deposit({from: accounts[0], value: sums[0]}); wins[0] += parseInt(sums[0]);
        await myMillions.deposit({from: accounts[0], value: sums[1]}); wins[0] += parseInt(sums[1]);
        await myMillions.deposit({from: accounts[1], value: sums[3]}); wins[1] += parseInt(sums[3]);
        await myMillions.deposit({from: accounts[2], value: sums[1]}); wins[2] += parseInt(sums[1]);
        await myMillions.deposit({from: accounts[3], value: sums[1]}); wins[3] += parseInt(sums[1]);
        await myMillions.deposit({from: accounts[4], value: sums[2]}); wins[4] += parseInt(sums[2]);
        await myMillions.deposit({from: accounts[5], value: sums[1]}); wins[5] += parseInt(sums[1]);
        await myMillions.deposit({from: accounts[6], value: sums[4]}); wins[6] += parseInt(sums[4]);
        await myMillions.deposit({from: accounts[0], value: sums[5]}); wins[0] += parseInt(sums[5]);

        let winAddresses = [
            accounts[0],
            accounts[6],
            accounts[1],
            accounts[4],
            accounts[3],
            accounts[5],
            accounts[2]
        ];

        // check momental leaders tables
        let leaders = await myMillions.getLeaders(0);
        let addresses = leaders[0];
        let balance = leaders[1].map(x => x.toNumber());

        wins = wins.sort((a, b) => b - a);

        for (var i = 0; i < addresses.length; i++) {
            expect(addresses[i]).to.equal(winAddresses[i]);
            expect(wins[i]).to.equal(balance[i]);
        }
    });

});
