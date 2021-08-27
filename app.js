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
  password: "",
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
                console.log("pooh price_2lc = ", price_2lc);
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=BTCUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_btcb = responseData.price;
                console.log("pooh price_btcb = ", price_btcb);
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=CAKEUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_cake = responseData.price;
                console.log("pooh price_cake = ", price_cake);
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=ETHUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_eth = responseData.price;
                console.log("pooh price_eth = ", price_eth);
            })
        await fetch('https://www.bitrue.com/api/v1/ticker/price?symbol=UNIUSDT')
            .then((response) => response.json())
            .then((responseData) => {
                price_uni = responseData.price;
                console.log("pooh price_uni = ", price_uni);
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

            const result = {
                status: token_info.status,
                messages: token_info.message,
                result: totalSupply
            }

            return res.send(totalSupply);
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
        
        setInterval(this.getPriceData, 2400000);
    }
}

new BuildAPI();