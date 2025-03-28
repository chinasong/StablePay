import React, { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import './WalletConnect.css';

const NETWORKS = {
  1: 'ETH',    // Ethereum Mainnet
  56: 'BNB',   // BSC Mainnet
  137: 'MATIC', // Polygon Mainnet
  10: 'ETH',   // Optimism
  42161: 'ETH', // Arbitrum
  43114: 'AVAX', // Avalanche
  250: 'FTM',  // Fantom
  513100: 'ETHF', // ETHF
};

const WalletConnect = ({ onAccountChange }) => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [network, setNetwork] = useState('');

  const getNetworkName = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const networkId = parseInt(chainId, 16);
      return NETWORKS[networkId] || 'ETH';
    } catch (err) {
      console.error('获取网络失败:', err);
      return 'ETH';
    }
  };

  const updateBalance = async (address) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      const formattedBalance = (+balance.toString() / 1e18).toFixed(4);
      setBalance(formattedBalance);
      const networkName = await getNetworkName();
      setNetwork(networkName);
    } catch (err) {
      console.error('获取余额失败:', err);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('请先安装 MetaMask 钱包');
      }

      // 每次连接都重新请求钱包授权
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      // 获取当前账户
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        onAccountChange(accounts[0]);
        await updateBalance(accounts[0]);
      }

      setError('');
    } catch (err) {
      setError(err.message);
      setAccount('');
      onAccountChange('');
      setBalance('');
      setNetwork('');
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    onAccountChange('');
    setBalance('');
    setError('');
    setNetwork('');
  };

  useEffect(() => {
    if (window.ethereum) {
      // 监听账户变化
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          onAccountChange(accounts[0]);
          await updateBalance(accounts[0]);
        } else {
          setAccount('');
          onAccountChange('');
          setBalance('');
          setNetwork('');
        }
      });

      // 监听链变化
      window.ethereum.on('chainChanged', async () => {
        if (account) {
          await updateBalance(account);
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [account, onAccountChange]);

  return (
    <div className="wallet-connect">
      {error && <div className="error">{error}</div>}
      {!account ? (
        <button onClick={connectWallet} className="connect-button">连接 MetaMask</button>
      ) : (
        <div className="wallet-info">
          <p>钱包地址: {account}</p>
          <p>余额: {balance} {network}</p>
          <button onClick={disconnectWallet} className="disconnect-button">断开连接</button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 