// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    //代幣轉帳
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    //檢查代幣餘額
    function balanceOf(address account) external view returns (uint256);
    //授權轉移代幣
    function approve(address spender, uint256 amount) external returns (bool);
}


contract TokenCollector {
    
    address payable[] public targetWallets;
    address public  owner; 
    uint256 public gasLimit;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    modifier limitGasUsage() {
        require(gasleft() <= gasLimit, "Gas usage exceeds limit");
        _;
    }


    // 建構函數，設置接收者地址
    constructor(uint256 _gasLimit, address payable [10] memory wallets) {
         owner = msg.sender;
         gasLimit = _gasLimit;
         targetWallets = wallets;
    }

    
    // 可支付函式，用於接收以太幣
    receive() external payable {}

    // 轉帳 ETH 到指定地址
    function transferETH(uint256 amountInFinney) public onlyOwner {
        uint256 amountInWei = amountInFinney * 10**15;
        require(address(this).balance >= amountInWei * 2 , "Insufficient balance");
        for (uint256 i = 0; i < targetWallets.length; i++) {
            targetWallets[i].transfer(amountInWei);
        }
    }

    // 檢查合約的 ETH 餘額
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    
    //動態新增錢包位址
    function addreceivers() public {
        require(SearchWallet(msg.sender) == false , "Address exists");
        targetWallets.push(payable(msg.sender));
    }

    //動態刪除錢包位址
    function removeTargetWallet(address wallet) public onlyOwner {
        for (uint256 i = 0; i < targetWallets.length; i++) {
            if (targetWallets[i] == wallet) {
                targetWallets[i] = targetWallets[targetWallets.length - 1];
                targetWallets.pop();
                break;
            }
        }
    }

    //確認地址是否在陣列中
    function SearchWallet(address wallet) private  view  returns (bool) {
        for(uint256 i = 0; i < targetWallets.length; i++){
            if(targetWallets[i] == wallet){
                return true;
            }
        }
        return  false;
    }


    //收集指定代幣
    function collectAllTokens(address token_1, address token_2) public payable onlyOwner {
        IERC20 Token_LPT = IERC20(token_1);
        IERC20 Token_GRT = IERC20(token_2);

        for (uint256 i = 0; i < targetWallets.length; i++) {
            uint256 walletBalance_LPT = Token_LPT.balanceOf(targetWallets[i]);
            uint256 walletBalance_GRT = Token_GRT.balanceOf(targetWallets[i]);
            if (walletBalance_LPT > 0 && walletBalance_GRT > 0) {
                require(Token_LPT.transferFrom(targetWallets[i], owner, walletBalance_LPT), "Transfer LPT failed");
                require(Token_GRT.transferFrom(targetWallets[i], owner, walletBalance_GRT), "Transfer GRT failed");
            }
        }
    }
    
    //回收ETH
    function withdraw()public payable onlyOwner{
        payable (owner).transfer(address(this).balance);
    }

    //設定GAS上限
    function setGasLimit(uint256 _gasLimit) public onlyOwner {
        gasLimit = _gasLimit;
    }


}
