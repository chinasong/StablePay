import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './CreateToken.css';

// 合约 ABI
const TOKEN_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
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
            }
        ],
        "name": "createToken",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

// 合约地址
const CONTRACT_ADDRESS = "0x3B236CEeB75207cD99068F21B871F7cE91D1f113";

// 格式化数字，添加千位分隔符（只对整数部分）
const formatNumber = (number) => {
    const parts = number.toString().split('.');
    if (parts.length > 1) {
        return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '.' + parts[1];
    }
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// 移除千位分隔符
const removeCommas = (str) => {
    return str.replace(/,/g, '');
};

const CreateToken = ({ account, onTokenCreated }) => {
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [totalSupply, setTotalSupply] = useState('');
    const [ethfAmount, setEthfAmount] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState('0');

    // 获取 ETHF 余额
    const getBalance = async () => {
        try {
            if (!window.ethereum || !account) return;

            const provider = new ethers.BrowserProvider(window.ethereum);
            const balance = await provider.getBalance(account);
            setBalance(ethers.formatEther(balance));
        } catch (err) {
            console.error('获取余额失败:', err);
        }
    };

    // 监听账户变化
    useEffect(() => {
        getBalance();
    }, [account]);

    // 检查网络
    const checkNetwork = async () => {
        if (!window.ethereum) {
            throw new Error('请安装 MetaMask!');
        }

        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        // ETHF 网络的链 ID 是 513100
        if (chainId !== '0x7d44c') {
            throw new Error('请切换到 ETHF 网络!');
        }
    };

    const handleCreateToken = async () => {
        try {
            setError('');
            setLoading(true);

            // 检查网络
            await checkNetwork();

            // 验证输入
            if (!tokenName || !tokenSymbol || !totalSupply || !ethfAmount) {
                throw new Error('请填写所有字段');
            }

            // 验证数字输入
            const totalSupplyNum = Number(removeCommas(totalSupply));
            const ethfAmountNum = Number(removeCommas(ethfAmount));
            const balanceNum = Number(balance);

            if (isNaN(totalSupplyNum) || totalSupplyNum <= 0) {
                throw new Error('代币总量必须大于0');
            }

            if (isNaN(ethfAmountNum) || ethfAmountNum <= 0) {
                throw new Error('抵押 ETHF 数量必须大于0');
            }

            // 检查余额是否足够
            if (ethfAmountNum > balanceNum) {
                throw new Error(`ETHF 余额不足，当前余额: ${formatNumber(balance)} ETHF`);
            }

            // 转换为 Wei
            const ethfAmountWei = ethers.parseEther(removeCommas(ethfAmount));
            // 代币总量不需要转换为 Wei，直接使用原始数值
            const totalSupplyWei = ethers.parseUnits(removeCommas(totalSupply), 18);

            // 创建合约实例
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);

            // 创建代币
            const tx = await contract.createToken(
                tokenName,
                tokenSymbol,
                ethfAmountWei,
                totalSupplyWei,
                { value: ethfAmountWei }
            );

            await tx.wait();
            alert('代币创建成功！');
            setTokenName('');
            setTokenSymbol('');
            setTotalSupply('');
            setEthfAmount('');
            // 更新余额
            await getBalance();
            // 通知父组件刷新代币列表
            if (onTokenCreated) {
                onTokenCreated();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 处理数字输入
    const handleNumberInput = (value, setter) => {
        // 移除所有非数字字符（除了小数点）
        const cleanValue = value.replace(/[^\d.]/g, '');
        // 确保只有一个小数点
        const parts = cleanValue.split('.');
        if (parts.length > 2) {
            return;
        }
        // 格式化整数部分
        const formattedValue = parts[0] ? formatNumber(parts[0]) : '';
        // 如果有小数部分，直接添加回去，不添加千位分隔符
        const finalValue = parts[1] ? `${formattedValue}.${parts[1]}` : formattedValue;
        setter(finalValue);
    };

    // 如果未连接钱包，显示提示信息
    if (!account) {
        return (
            <div className="wallet-not-connected">
                <h2>请先连接钱包</h2>
                <p>连接钱包后即可创建代币</p>
            </div>
        );
    }

    return (
        <div className="create-token">
            <h2>创建新代币</h2>
            <div className="balance-info">
                当前 ETHF 余额: {formatNumber(balance)} ETHF
            </div>
            <div className="form-group">
                <label>代币名称</label>
                <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="例如: Stable Coin"
                />
            </div>
            <div className="form-group">
                <label>代币符号</label>
                <input
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                    placeholder="例如: SC"
                />
            </div>
            <div className="form-group">
                <label>代币总量</label>
                <input
                    type="text"
                    value={totalSupply}
                    onChange={(e) => handleNumberInput(e.target.value, setTotalSupply)}
                    placeholder="例如: 1,000,000"
                    min="1"
                />
            </div>
            <div className="form-group">
                <label>抵押 ETHF 数量</label>
                <input
                    type="text"
                    value={ethfAmount}
                    onChange={(e) => handleNumberInput(e.target.value, setEthfAmount)}
                    placeholder="例如: 1"
                    min="0.000000000000000001"
                />
            </div>
            {error && <div className="error">{error}</div>}
            <button
                className="create-button"
                onClick={handleCreateToken}
                disabled={loading || !tokenName || !tokenSymbol || !totalSupply || !ethfAmount}
            >
                {loading ? '创建中...' : '创建代币'}
            </button>
        </div>
    );
};

export default CreateToken; 