import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import CreateToken from './components/CreateToken';
import TokenList from './components/TokenList';
import WalletConnect from './components/WalletConnect';

function App() {
  const [currentAccount, setCurrentAccount] = useState('');

  const handleAccountChange = (account) => {
    setCurrentAccount(account);
  };

  return (
    <Router basename="/StablePay">
      <div className="App">
        <WalletConnect onAccountChange={handleAccountChange} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateToken account={currentAccount} />} />
          <Route path="/list" element={<TokenList account={currentAccount} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 