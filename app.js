const express = require("express");
const fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const NodeCache = require( "node-cache" );
const Web3 = require('web3');
const fs = require('fs');

require('dotenv').config();

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

    defineEndPoints() {
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
}

new BuildAPI();