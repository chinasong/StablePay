import React, { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import CreateToken from './components/CreateToken';
import TokenList from './components/TokenList';
import './App.css';

function App() {
  const [currentAccount, setCurrentAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [refreshTokenList, setRefreshTokenList] = useState(0);

  // 检查钱包连接状态
  const checkWalletConnection = async () => {
    try {
      if (!window.ethereum) {
        console.log('请安装 MetaMask!');
        return;
      }

      // 检查是否已经授权
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('检查钱包连接状态失败:', error);
    }
  };

  // 页面加载时检查钱包连接状态
  useEffect(() => {
    checkWalletConnection();
  }, []);

  // 监听账户变化
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setCurrentAccount('');
          setIsConnected(false);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('请安装 MetaMask!');
        return;
      }

      // 请求用户连接钱包
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setCurrentAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error('连接钱包失败:', error);
      alert('连接钱包失败: ' + error.message);
    }
  };

  const disconnectWallet = () => {
    setCurrentAccount('');
    setIsConnected(false);
  };

  // 刷新代币列表
  const handleTokenCreated = () => {
    setRefreshTokenList(prev => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>StablePay</h1>
        <div className="wallet-info">
          {!isConnected ? (
            <button onClick={connectWallet} className="connect-button">
              连接钱包
            </button>
          ) : (
            <div className="connected-info">
              <span className="account-address">
                {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
              </span>
              <button onClick={disconnectWallet} className="disconnect-button">
                断开连接
              </button>
            </div>
          )}
        </div>
      </header>
      <main>
        {isConnected && (
          <>
            <CreateToken account={currentAccount} onTokenCreated={handleTokenCreated} />
            <TokenList account={currentAccount} refreshTrigger={refreshTokenList} />
          </>
        )}
      </main>
      <style jsx>{`
        .App {
          text-align: center;
          min-height: 100vh;
          background-color: #f5f7fa;
        }

        .App-header {
          background-color: #2c3e50;
          padding: 20px;
          color: white;
          margin-bottom: 30px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          margin-bottom: 20px;
        }

        .wallet-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .connect-button, .disconnect-button {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.2s;
        }

        .connect-button:hover {
          background-color: #2980b9;
        }

        .disconnect-button {
          background-color: #e74c3c;
        }

        .disconnect-button:hover {
          background-color: #c0392b;
        }

        .account-info {
          font-size: 14px;
          margin: 0;
          opacity: 0.8;
        }

        main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
      `}</style>
    </div>
  );
}

export default App; 