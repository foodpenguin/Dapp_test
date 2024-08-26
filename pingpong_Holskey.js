require('dotenv').config();
const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const { type } = require('os');

const web3 = new Web3("https://ethereum-holesky-rpc.publicnode.com");

// 獲取私鑰和創建帳戶
const privateKey = process.env.PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

// 獲取合約地址與abi
const mycontract_Abi = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'mycontract_abi.json'), 'utf-8'));
const mycontract_Address = process.env.MYCONNTRACT_ADDRESS;

const GRT_Abi = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'GRT_abi.json'), 'utf-8'));
const GRT = process.env.GRT_ADDRESS;

const LPT_Abi = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'LPT_abi.json'), 'utf-8'));
const LPT = process.env.LPT_ADDRESS;

const bridge_Abi = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'bridge_contract_abi.json'), 'utf-8'));
const bridge_Address = process.env.BRIDGE_ADDRESS;

// 創建合約實例
const mycontract = new web3.eth.Contract(mycontract_Abi, mycontract_Address);
const GRTcontract = new web3.eth.Contract(GRT_Abi, GRT);
const LPTcontract = new web3.eth.Contract(LPT_Abi, LPT);
const bridge = new web3.eth.Contract(bridge_Abi, bridge_Address);

async function getTokenBalance(contract){
    try{
        const balance = await contract.methods.balanceOf(account.address).call();
        return Number(balance);
    } catch(error){
        console.error("Error getting token balance:", error);
        return null;
    }
}

//呼叫mycontract的collectAllTokens函式，並取得代幣餘額
async function TokenCollector(){
    try{
        const data = mycontract.methods.collectAllTokens(GRT, LPT).encodeABI();
        const nonce = await web3.eth.getTransactionCount(account.address);

        //取得預估gas費用
        const gas = await web3.eth.estimateGas({
            from: account.address,
            to: mycontract_Address,
            data: data
        });

        const gasPrice = await web3.eth.getGasPrice();

        //設定交易
        const tx = {
            from: account.address,
            to: mycontract_Address,
            gas: gas,
            gasPrice: gasPrice,
            data: data,
            nonce: nonce
        };

        //簽署交易
        const signedTx = await account.signTransaction(tx);
        //發送交易
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log("Transaction Hash: " + receipt.transactionHash);

        const GRT_balance = await getTokenBalance(GRTcontract) / (10 ** 18);
        const LPT_balance = await getTokenBalance(LPTcontract) / (10 ** 18);

        console.log(`Balance of GRT: ${GRT_balance}`);
        console.log(`Balance of LPT: ${LPT_balance}`);

    } catch(error){
        console.error("Error sending transaction:", error);
    }
}


//橋接指定代幣
async function BridgeToken(token, contract){
    try{
        const tokenbalance = await getTokenBalance(contract);
        const data = bridge.methods.bridge(token, account.address, BigInt(tokenbalance)).encodeABI();
        const nonce = await web3.eth.getTransactionCount(account.address);

 

        const maxFeePerGas = Number((await web3.eth.calculateFeeData()).maxFeePerGas);
        const maxPriorityFeePerGas = Number((await web3.eth.calculateFeeData()).maxPriorityFeePerGas);

        //設定交易
        const tx = {
            from: account.address,
            to: bridge_Address,
            data: data,
            value: 1500000000000000,
            nonce: nonce,
            gasLimit : 300000,
            maxFeePerGas : maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            type: 2,
        };

        //簽署交易
        const signedTx = await account.signTransaction(tx);
        //發送交易
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log("Transaction Hash: " + receipt.transactionHash);

        const GRT_balance = await getTokenBalance(GRTcontract) / (10 ** 18);
        const LPT_balance = await getTokenBalance(LPTcontract) / (10 ** 18);

        console.log(`Balance of GRT: ${GRT_balance}`);
        console.log(`Balance of LPT: ${LPT_balance}`);

    } catch(error){
        console.error("Error sending transaction:", error);
    }
}


TokenCollector();
setTimeout(BridgeToken,60000,GRT,GRTcontract);
setTimeout(BridgeToken,60000,LPT,LPTcontract);
BridgeToken(GRT, GRTcontract);
BridgeToken(LPT, LPTcontract);