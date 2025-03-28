import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import CreateToken from './components/CreateToken';
import TokenList from './components/TokenList';
import WalletConnect from './components/WalletConnect';

function App() {
  return (
    <Router basename="/StablePay">
      <div className="App">
        <WalletConnect />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateToken />} />
          <Route path="/list" element={<TokenList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 