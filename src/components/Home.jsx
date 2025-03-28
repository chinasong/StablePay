import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = ({ account }) => {
  const navigate = useNavigate();

  const handleCreateToken = () => {
    navigate('/create-token');
  };

  return (
    <div className="home-container">
      <h1>Welcome to StablePay</h1>
      <p>Your secure payment solution</p>
      {account && (
        <button onClick={handleCreateToken} className="create-token-button">
          创建抵押稳定币
        </button>
      )}
    </div>
  );
};

export default Home; 