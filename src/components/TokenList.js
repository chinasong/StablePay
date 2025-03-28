import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './TokenList.css';

// 合约地址
const CONTRACT_ADDRESS = "0x3B236CEeB75207cD99068F21B871F7cE91D1f113";

// 合约 ABI
const TOKEN_ABI = [
    {
        "inputs": [],
        "name": "getTokenList",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            }
        ],
        "name": "getTokenInfo",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "tokenAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "creator",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "collateralAmount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "totalSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "exchangeRate",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct CollateralTokenFactory.TokenInfo",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "tokenSymbols",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "tokenAmount",
                "type": "uint256"
            }
        ],
        "name": "redeemCollateral",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// ERC20 代币 ABI
const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
];

const TokenList = ({ account, refreshTrigger }) => {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [redeemModal, setRedeemModal] = useState(false);
    const [selectedToken, setSelectedToken] = useState(null);
    const [redeemAmount, setRedeemAmount] = useState('');
    const [redeemEthfAmount, setRedeemEthfAmount] = useState('0');

    // 获取代币列表
    const getTokenList = async () => {
        try {
            setLoading(true);
            setError('');

            if (!window.ethereum) {
                throw new Error('请安装 MetaMask!');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, provider);

            // 获取代币列表
            const tokenList = await contract.getTokenList();
            
            // 获取每个代币的详细信息
            const tokenDetails = await Promise.all(
                tokenList.map(async (tokenAddress) => {
                    // 先获取代币符号
                    const symbol = await contract.tokenSymbols(tokenAddress);
                    // 使用代币符号获取详细信息
                    const tokenInfo = await contract.getTokenInfo(symbol);
                    // 检查用户是否持有该代币
                    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
                    const balance = await tokenContract.balanceOf(account);
                    return {
                        address: tokenAddress,
                        symbol: symbol,
                        creator: tokenInfo.creator,
                        collateralAmount: tokenInfo.collateralAmount,
                        totalSupply: tokenInfo.totalSupply,
                        exchangeRate: tokenInfo.exchangeRate,
                        userBalance: balance
                    };
                })
            );

            setTokens(tokenDetails);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 计算可赎回的 ETHF 数量
    const calculateRedeemEthfAmount = (tokenAddress, amount) => {
        const token = tokens.find(t => t.address === tokenAddress);
        if (!token) return '0';
        
        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum <= 0) return '0';
        
        // 使用初始兑换比例计算可赎回的 ETHF 数量
        // redeemAmount = tokenAmount / exchangeRate
        // 将代币数量转换为 Wei (18位小数)
        const tokenAmountWei = ethers.parseUnits(amountNum.toString(), 18);
        const ethfAmount = (BigInt(tokenAmountWei) * BigInt(1e18)) / BigInt(token.exchangeRate);
        return ethers.formatEther(ethfAmount);
    };

    // 打开赎回弹出框
    const openRedeemModal = (token) => {
        setSelectedToken(token);
        setRedeemAmount('');
        setRedeemEthfAmount('0');
        setRedeemModal(true);
    };

    // 关闭赎回弹出框
    const closeRedeemModal = () => {
        setRedeemModal(false);
        setSelectedToken(null);
        setRedeemAmount('');
        setRedeemEthfAmount('0');
    };

    // 处理赎回数量输入
    const handleRedeemAmountChange = (e) => {
        const value = e.target.value;
        setRedeemAmount(value);
        if (selectedToken) {
            const ethfAmount = calculateRedeemEthfAmount(selectedToken.address, value);
            setRedeemEthfAmount(ethfAmount);
        }
    };

    // 赎回抵押品
    const handleRedeem = async () => {
        try {
            setRedeeming(true);
            if (!window.ethereum) {
                throw new Error('请安装 MetaMask!');
            }

            const amount = Number(redeemAmount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('请输入有效的赎回数量');
            }

            if (amount > selectedToken.userBalance) {
                throw new Error('赎回数量不能超过您的代币余额');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);

            // 将赎回数量转换为 Wei
            const tokenAmountWei = ethers.parseUnits(amount.toString(), 18);
            const tx = await contract.redeemCollateral(selectedToken.address, tokenAmountWei);
            await tx.wait();
            
            // 刷新代币列表
            await getTokenList();
            closeRedeemModal();
        } catch (err) {
            // 处理用户拒绝操作的情况
            if (err.code === 4001) {
                setError('您已拒绝该操作');
            } else {
                setError(err.message);
            }
        } finally {
            setRedeeming(false);
        }
    };

    // 复制地址到剪贴板
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('地址已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    };

    // 格式化地址显示
    const formatAddress = (address) => {
        if (!address) return '未知地址';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // 监听刷新触发器
    useEffect(() => {
        if (account) {
            getTokenList();
        }
    }, [account, refreshTrigger]);

    if (!account) {
        return (
            <div className="wallet-not-connected">
                <h2>请先连接钱包</h2>
                <p>连接钱包后即可查看代币列表</p>
            </div>
        );
    }

    if (loading) {
        return <div className="loading">加载中...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="token-list">
            <h2>已创建的代币</h2>
            {tokens.length === 0 ? (
                <p>暂无代币</p>
            ) : (
                <div className="tokens-grid">
                    {tokens.map((token, index) => (
                        <div key={index} className="token-card">
                            <div className="token-info">
                                <div className="token-address">
                                    <span>代币合约地址:</span>
                                    <div className="address-container">
                                        <code>{formatAddress(token.address)}</code>
                                        <button 
                                            className="copy-button"
                                            onClick={() => copyToClipboard(token.address)}
                                            disabled={!token.address}
                                        >
                                            复制
                                        </button>
                                    </div>
                                </div>
                                <div className="token-details">
                                    <p>创建者: {formatAddress(token.creator)}</p>
                                    <p>抵押 ETHF: {ethers.formatEther(token.collateralAmount)}</p>
                                    <p>代币总量: {ethers.formatUnits(token.totalSupply, 18)}</p>
                                    <p>兑换比例: 1 ETHF = {token.collateralAmount > 0 ? ethers.formatUnits((BigInt(token.totalSupply) * BigInt(1e18)) / BigInt(token.collateralAmount), 18) : '0'} {token.symbol}</p>
                                    <p>您的余额: {ethers.formatUnits(token.userBalance, 18)}</p>
                                </div>
                                {token.userBalance && token.userBalance > 0 && (
                                    <div className="token-actions">
                                        <button 
                                            className="redeem-button"
                                            onClick={() => openRedeemModal(token)}
                                            disabled={redeeming}
                                        >
                                            {redeeming ? '赎回中...' : '赎回 ETHF'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 赎回弹出框 */}
            {redeemModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>赎回 {selectedToken?.symbol}</h3>
                        <div className="form-group">
                            <label>赎回数量</label>
                            <div className="input-with-max">
                                <input
                                    type="number"
                                    value={redeemAmount}
                                    onChange={handleRedeemAmountChange}
                                    placeholder="输入赎回数量"
                                    min="0"
                                    max={ethers.formatUnits(selectedToken?.userBalance || 0, 18)}
                                    step="any"
                                />
                                <button 
                                    className="max-button"
                                    onClick={() => {
                                        if (selectedToken) {
                                            setRedeemAmount(ethers.formatUnits(selectedToken.userBalance, 18));
                                            setRedeemEthfAmount(calculateRedeemEthfAmount(selectedToken.address, ethers.formatUnits(selectedToken.userBalance, 18)));
                                        }
                                    }}
                                >
                                    MAX
                                </button>
                            </div>
                            <p className="balance-info">可用余额: {ethers.formatUnits(selectedToken?.userBalance || 0, 18)}</p>
                        </div>
                        <div className="redeem-info">
                            <p>可赎回 ETHF 数量: {redeemEthfAmount}</p>
                        </div>
                        <div className="modal-actions">
                            <button onClick={closeRedeemModal} className="cancel-button">取消</button>
                            <button 
                                onClick={handleRedeem} 
                                disabled={redeeming || !redeemAmount || Number(redeemAmount) <= 0 || Number(redeemAmount) > (selectedToken?.userBalance || 0)}
                                className="confirm-button"
                            >
                                {redeeming ? '赎回中...' : '确认赎回'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TokenList; 