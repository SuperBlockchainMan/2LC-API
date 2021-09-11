const express = require("express");
const fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const NodeCache = require( "node-cache" );
const Web3 = require('web3');
const fs = require('fs');
const mysql = require("mysql");

require('dotenv').config();

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "price"
});

connection.connect(function(err) {
  if (err) {
    console.error('error: ' + err.message);
  } else {
    console.log('Connected to the MySQL server.');
  }  
});

class BuildAPI {
    constructor() {
        this.app = express();
        this.cache = new NodeCache({ stdTTL: 60 * 20, checkperiod: 60 * 22 });
        this.web3 = new Web3('https://bsc-dataseed1.binance.org:443');

        this.app.use(function(req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.header('Access-Control-Allow-Credentials', true);
            return next();
        });

        this.app.listen(3000, () => {
            console.log("Server running on port 3000");
        });

        this.defineEndPoints();
    }

    getTokenInfoUrl(token) {
        let url = new URL('https://api.bscscan.com/api');

        let params = {
            module: 'stats',
            action: 'tokensupply',
            contractAddress: token,
            apikey: 'G49KISQJYVS8I39WGI4RYS29AM68HH3ZBF'
        };

        url.search = new URLSearchParams(params).toString();

        return url;
    }

    getTokenBalanceUrl(token, address) {
        let url = new URL('https://api.bscscan.com/api');

        let params = {
            module: 'account',
            action: 'tokenbalance',
            contractAddress: token,
            address: address,
            tag: 'latest',
            apikey: 'G49KISQJYVS8I39WGI4RYS29AM68HH3ZBF'
        };

        url.search = new URLSearchParams(params).toString();

        return url;
    }

    async getPriceData() {

        var price_2lc = 0;
        var price_btcb = 0;
        var price_cake = 0;
        var price_eth = 0;
        var price_uni = 0;

        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=2LCUSDT')
            .then((response) => response.json())
            .then((responseData) => {                
                price_2lc = responseData.price;
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=BTCUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_btcb = responseData.price;
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=CAKEUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_cake = responseData.price;
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=ETHUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_eth = responseData.price;
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=UNIUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_uni = responseData.price;
            })

        var sql = `insert prices SET ?`
        var newPrice = {
            date: new Date(),
            price_2lc: price_2lc,
            price_btcb: price_btcb,
            price_cake: price_cake,
            price_eth: price_eth,
            price_uni: price_uni
        }
        connection.query(sql, newPrice, (err, res) => {
            if (err) {
              console.log("error: ", err);
              return;
            }
            console.log("inserted new price data");
        });
    }

    defineEndPoints() {
        this.app.get("/", (req, res) => {
            res.json({ message: "Welcome to application." });
        });

        this.app.get("/getLastPriceData", async (req, res, next) => {
            var price_bnb = 0;
            await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=BNBUSDT')
                .then((response) => response.json())
                .then((responseData) => {
                    price_bnb = responseData.price;
                    console.log("pooh price_bnb = ", price_bnb);
                })

            var sql = "SELECT * FROM `prices` ORDER BY date DESC LIMIT 1";
            connection.query(sql, (error, result) => {
                if (error) {
                    res.send({ status: false, message: 'Getting Error' + error })
                } else {
                    if (result.length > 0) {
                        result.price_bnb = price_bnb;
                        res.send(result);
                    } else {
                        res.send({ status: false, message: "Invalid Link" });
                    }

                }
            })
        });

        this.app.get("/getPriceData", async (req, res, next) => {
            var sql = "SELECT * FROM ( SELECT * FROM `prices` ORDER BY date DESC LIMIT 2520 ) sub ORDER BY id ASC";    
            connection.query(sql, (error, result) => {
                if (error) {
                    res.send({ status: false, message: 'Getting Error' + error })
                } else {
                    if (result.length > 0) {
                        res.send(result);
                    } else {
                        res.send({ status: false, message: "Invalid Link" });
                    }

                }
            })
        });

        this.app.get("/tokenSupply/:token", async (req, res, next) => {
            let token = req.params.token, details, liquidity_data, token_score;

            if (!token.startsWith("0x") || token.length !== 42) {
                return res.json({
                    error: "Invalid token"
                });
            }

            const token_info = await fetch(this.getTokenInfoUrl(token)).then((response) => response.json());

            let totalSupply = token_info.result.toString();
            const length = totalSupply.length;
            const decimal = 18;

            totalSupply = totalSupply.substring(0, length - decimal) + "." + totalSupply.substring(length - decimal);

            return res.send(totalSupply);
        });

        this.app.get("/tokenCirc/:token", async (req, res, next) => {
            
            let token = req.params.token, details, liquidity_data, token_score;

            if (!token.startsWith("0x") || token.length !== 42) {
                return res.json({
                    error: "Invalid token"
                });
            }

            const lockContractSold = '0xD1aBeE9312C128d30781C6C3A712eD956F3ec418';
            const lockContractUnsold = '0x39E2b6478c164970C9DBc94E883F47e9801dF531';
            const localwallet = '0x468c67832c3b2669BEc60A2C48Fb9D07Db125364';
            const pancakeswap = '0xf4269AcE31E90A15086b16d969f293bEda91BfC4';
            const yieldFarm = '0xA77924b786314fA4F7E603C10c372dA1E779b8d1';

            const token_info = await fetch(this.getTokenInfoUrl(token)).then((response) => response.json());
            const lockContractSold_info = await fetch(this.getTokenBalanceUrl(token, lockContractSold)).then((response) => response.json());
            const lockContractUnsold_info = await fetch(this.getTokenBalanceUrl(token, lockContractUnsold)).then((response) => response.json());
            const localwallet_info = await fetch(this.getTokenBalanceUrl(token, localwallet)).then((response) => response.json());
            const pancakeswap_info = await fetch(this.getTokenBalanceUrl(token, pancakeswap)).then((response) => response.json());
            const yieldFarm_info = await fetch(this.getTokenBalanceUrl(token, yieldFarm)).then((response) => response.json());

            const tokenBalance = token_info.result / 1000000000000000000
            const lockContractSoldBalance = lockContractSold_info.result / 1000000000000000000
            const lockContractUnsoldBalance = lockContractUnsold_info.result / 1000000000000000000
            const localwalletBalance = localwallet_info.result / 1000000000000000000
            const pancakeswapBalance = pancakeswap_info.result / 1000000000000000000
            const yieldFarmBalance = yieldFarm_info.result / 1000000000000000000

            const circulationBalance = tokenBalance - lockContractSoldBalance - lockContractUnsoldBalance - localwalletBalance - pancakeswapBalance - yieldFarmBalance

            return res.send(circulationBalance.toString());
        });
        
        setInterval(this.getPriceData, 240000);
    }
}

new BuildAPI();