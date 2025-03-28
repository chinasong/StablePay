import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <h1>欢迎使用 StablePay</h1>
      <div className="feature-cards">
        <div className="feature-card">
          <h2>创建代币</h2>
          <p>使用 ETHF 作为抵押创建新的代币</p>
          <Link to="/create" className="feature-button">
            开始创建
          </Link>
        </div>
        <div className="feature-card">
          <h2>查看代币</h2>
          <p>查看和管理你创建的代币</p>
          <Link to="/list" className="feature-button">
            查看列表
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home; 