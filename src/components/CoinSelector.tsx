import React from 'react';
import Select from 'react-select';
import { Coin } from '../types';

interface CoinSelectorProps {
  coins: Coin[];
  selectedCoin: Coin | null;
  onSelectCoin: (coin: Coin) => void;
  isLoading: boolean;
}

const CoinSelector: React.FC<CoinSelectorProps> = ({
  coins,
  selectedCoin,
  onSelectCoin,
  isLoading,
}) => {
  const options = coins.map((coin) => ({
    value: coin.id,
    label: (
      <div className="flex items-center">
        <img src={coin.image} alt={coin.name} className="w-6 h-6 mr-2" />
        <span>{coin.name}</span>
        <span className="ml-2 text-gray-500">({coin.symbol.toUpperCase()})</span>
      </div>
    ),
    coin,
  }));

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'white',
      borderColor: '#e2e8f0',
      minHeight: '44px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#cbd5e0',
      },
    }),
    option: (provided: any, state: { isSelected: boolean }) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : 'white',
      color: state.isSelected ? 'white' : 'black',
      '&:hover': {
        backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
      },
    }),
  };

  return (
    <div className="w-full max-w-md">
      <label htmlFor="coin-select" className="block text-sm font-medium text-gray-700 mb-1">
        Select Cryptocurrency
      </label>
      <Select
        id="coin-select"
        options={options}
        value={
          selectedCoin
            ? options.find((option) => option.value === selectedCoin.id)
            : null
        }
        onChange={(option) => option && onSelectCoin(option.coin)}
        isLoading={isLoading}
        placeholder="Search for a cryptocurrency..."
        styles={customStyles}
        className="text-base"
        isSearchable
      />
    </div>
  );
};

export default CoinSelector;