// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CollateralToken.sol";

// 抵押代币工厂合约
contract CollateralTokenFactory is Ownable {
    // 存储所有创建的代币信息
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 collateralAmount;
        uint256 totalSupply;
        uint256 exchangeRate;
    }

    // 映射：代币符号 => 代币信息
    mapping(string => TokenInfo) public tokens;
    // 映射：代币地址 => 代币符号
    mapping(address => string) public tokenSymbols;
    // 用户创建的代币列表
    mapping(address => string[]) public userTokens;
    mapping(address => bool) public isToken;
    mapping(address => uint256) public tokenEthfBalance; // 每个代币的 ETHF 余额
    address[] public tokenList;

    event TokenCreated(
        string name,
        string symbol,
        address tokenAddress,
        address creator,
        uint256 collateralAmount,
        uint256 totalSupply
    );

    event TokenMinted(
        address tokenAddress,
        address minter,
        uint256 collateralAmount,
        uint256 tokenAmount
    );

    event CollateralRedeemed(
        address tokenAddress,
        address redeemer,
        uint256 tokenAmount,
        uint256 ethfAmount
    );

    constructor() {
        _transferOwnership(msg.sender);
    }

    // 创建新代币
    function createToken(
        string memory name,
        string memory symbol,
        uint256 collateralAmount,
        uint256 totalSupply
    ) external payable {
        require(msg.value == collateralAmount, "Incorrect collateral amount");
        require(totalSupply > 0, "Total supply must be greater than 0");
        require(tokens[symbol].tokenAddress == address(0), "Token symbol already exists");

        // 创建新代币
        CollateralToken newToken = new CollateralToken(name, symbol);
        address tokenAddress = address(newToken);

        // 计算兑换率：1 ETHF = totalSupply/collateralAmount 个代币
        uint256 exchangeRate = (totalSupply * 1e18) / collateralAmount;

        // 存储代币信息
        tokens[symbol] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            collateralAmount: collateralAmount,
            totalSupply: totalSupply,
            exchangeRate: exchangeRate
        });

        tokenSymbols[tokenAddress] = symbol;
        userTokens[msg.sender].push(symbol);
        isToken[tokenAddress] = true;
        tokenList.push(tokenAddress);
        tokenEthfBalance[tokenAddress] = collateralAmount; // 初始化代币的 ETHF 余额

        // 铸造代币给创建者
        newToken.mint(msg.sender, totalSupply);

        emit TokenCreated(
            name,
            symbol,
            tokenAddress,
            msg.sender,
            collateralAmount,
            totalSupply
        );
    }

    function mintToken(address tokenAddress, uint256 collateralAmount) external payable {
        require(isToken[tokenAddress], "Token does not exist");
        require(msg.value == collateralAmount, "Incorrect collateral amount");
        require(collateralAmount > 0, "Collateral amount must be greater than 0");

        string memory symbol = tokenSymbols[tokenAddress];
        TokenInfo storage tokenInfo = tokens[symbol];
        CollateralToken token = CollateralToken(tokenAddress);

        // 使用初始兑换比例计算可获得的代币数量
        // tokenAmount = collateralAmount * exchangeRate / 1e18
        uint256 tokenAmount = (collateralAmount * tokenInfo.exchangeRate) / 1e18;

        // 更新代币信息
        tokenInfo.collateralAmount += collateralAmount;
        tokenInfo.totalSupply += tokenAmount;
        tokenEthfBalance[tokenAddress] += collateralAmount; // 更新代币的 ETHF 余额

        // 铸造代币给用户
        token.mint(msg.sender, tokenAmount);

        // 如果是用户第一次获得这个代币，添加到他的代币列表中
        bool hasToken = false;
        string[] storage userTokenList = userTokens[msg.sender];
        for (uint i = 0; i < userTokenList.length; i++) {
            if (keccak256(bytes(userTokenList[i])) == keccak256(bytes(symbol))) {
                hasToken = true;
                break;
            }
        }
        if (!hasToken) {
            userTokens[msg.sender].push(symbol);
        }

        emit TokenMinted(tokenAddress, msg.sender, collateralAmount, tokenAmount);
    }

    // 赎回ETHF
    function redeemCollateral(address tokenAddress, uint256 tokenAmount) external {
        require(isToken[tokenAddress], "Token does not exist");
        CollateralToken token = CollateralToken(tokenAddress);
        string memory symbol = tokenSymbols[tokenAddress];
        TokenInfo storage tokenInfo = tokens[symbol];
        
        uint256 balance = token.balanceOf(msg.sender);
        require(balance >= tokenAmount, "Insufficient token balance");
        require(tokenAmount > 0, "Token amount must be greater than 0");

        // 使用初始兑换比例计算可赎回的 ETHF 数量
        // redeemAmount = tokenAmount / exchangeRate
        uint256 redeemAmount = (tokenAmount * 1e18) / tokenInfo.exchangeRate;

        // 确保代币的 ETHF 池子有足够的余额
        require(redeemAmount <= tokenEthfBalance[tokenAddress], "Insufficient ETHF balance in token pool");

        // 更新代币信息
        tokenInfo.collateralAmount -= redeemAmount;
        tokenInfo.totalSupply -= tokenAmount;
        tokenEthfBalance[tokenAddress] -= redeemAmount; // 更新代币的 ETHF 余额

        // 销毁代币
        token.burn(msg.sender, tokenAmount);

        // 转移 ETHF 给赎回者
        (bool success, ) = msg.sender.call{value: redeemAmount}("");
        require(success, "ETHF transfer failed");

        emit CollateralRedeemed(tokenAddress, msg.sender, tokenAmount, redeemAmount);
    }

    // 获取代币信息
    function getTokenInfo(string memory symbol) external view returns (TokenInfo memory) {
        return tokens[symbol];
    }

    // 获取用户创建的代币列表
    function getUserTokens(address user) external view returns (string[] memory) {
        return userTokens[user];
    }

    // 获取代币的兑换比例
    function getExchangeRate(string memory symbol) external view returns (uint256) {
        TokenInfo storage tokenInfo = tokens[symbol];
        require(tokenInfo.tokenAddress != address(0), "Token does not exist");
        return tokenInfo.exchangeRate;
    }

    function getTokenEthfBalance(address tokenAddress) external view returns (uint256) {
        return tokenEthfBalance[tokenAddress];
    }

    // 接收ETHF
    receive() external payable {}

    function getTokenList() external view returns (address[] memory) {
        return tokenList;
    }
} 