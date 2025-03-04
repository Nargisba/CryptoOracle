import React from 'react';
import { CoinPrediction } from '../types';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface PredictionSummaryProps {
  prediction: CoinPrediction;
}

const PredictionSummary: React.FC<PredictionSummaryProps> = ({ prediction }) => {
  const { coin, predictions, lastUpdated } = prediction;
  
  // Calculate price change percentages
  const calculateChange = (timeframe: 'nextWeek' | 'nextMonth' | 'nextYear') => {
    const data = predictions[timeframe].data;
    const startPrice = coin.current_price;
    const endPrice = data[data.length - 1].price;
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;
    
    return {
      endPrice,
      changePercent,
      isPositive: changePercent >= 0,
    };
  };
  
  const weekChange = calculateChange('nextWeek');
  const monthChange = calculateChange('nextMonth');
  const yearChange = calculateChange('nextYear');
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };
  
  const renderPredictionCard = (
    title: string,
    endDate: string,
    change: { endPrice: number; changePercent: number; isPositive: boolean }
  ) => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="mt-1 flex items-baseline">
          <p className="text-xl font-semibold text-gray-900">
            {formatPrice(change.endPrice)}
          </p>
          <p
            className={`ml-2 flex items-center text-sm font-medium ${
              change.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change.isPositive ? (
              <TrendingUp className="mr-1 h-4 w-4" />
            ) : (
              <TrendingDown className="mr-1 h-4 w-4" />
            )}
            {change.changePercent.toFixed(2)}%
          </p>
        </div>
        <p className="mt-1 text-xs text-gray-500">By {endDate}</p>
      </div>
    );
  };
  
  // Special case for PI Network
  const isPiNetwork = coin.id === 'pi-network';
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <img src={coin.image} alt={coin.name} className="w-12 h-12 mr-4" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{coin.name}</h2>
            <p className="text-sm text-gray-500">{coin.symbol.toUpperCase()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{formatPrice(coin.current_price)}</p>
          <p
            className={`text-sm font-medium ${
              coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {coin.price_change_percentage_24h >= 0 ? '+' : ''}
            {coin.price_change_percentage_24h.toFixed(2)}% (24h)
          </p>
        </div>
      </div>
      
      {isPiNetwork && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                PI Network is not yet traded on major exchanges. These predictions are based on estimated values and community expectations.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-4">Price Predictions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {renderPredictionCard(
          '7-Day Forecast',
          predictions.nextWeek.data[predictions.nextWeek.data.length - 1].date,
          weekChange
        )}
        {renderPredictionCard(
          'Monthly Forecast',
          predictions.nextMonth.data[predictions.nextMonth.data.length - 1].date,
          monthChange
        )}
        {renderPredictionCard(
          'Yearly Forecast',
          predictions.nextYear.data[predictions.nextYear.data.length - 1].date,
          yearChange
        )}
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-500">
          Last updated: {formatDate(lastUpdated)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          <strong>Disclaimer:</strong> These predictions are based on historical data and news sentiment analysis. 
          Cryptocurrency markets are highly volatile and actual results may vary significantly.
        </p>
      </div>
    </div>
  );
};

export default PredictionSummary;