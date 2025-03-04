import React, { useState, useEffect } from 'react';
import { Coin, CoinPrediction, NewsItem } from './types';
import { getCoins, generatePredictions, getCoinNews } from './api/coinApi';
import CoinSelector from './components/CoinSelector';
import PriceChart from './components/PriceChart';
import PredictionSummary from './components/PredictionSummary';
import NewsSection from './components/NewsSection';
import LoadingState from './components/LoadingState';
import { RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

function App() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [prediction, setPrediction] = useState<CoinPrediction | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeTimeframe, setActiveTimeframe] = useState<'nextWeek' | 'nextMonth' | 'nextYear'>('nextWeek');
  const [loading, setLoading] = useState({
    coins: true,
    prediction: false,
    news: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch coins on component mount
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const fetchedCoins = await getCoins();
        setCoins(fetchedCoins);
        
        // Set PI Network as default selected coin
        if (fetchedCoins.length > 0) {
          const piNetwork = fetchedCoins.find(coin => coin.id === 'pi-network');
          const bitcoin = fetchedCoins.find(coin => coin.id === 'bitcoin');
          setSelectedCoin(piNetwork || bitcoin || fetchedCoins[0]);
        }
      } catch (err) {
        setError('Failed to fetch cryptocurrencies. Please try again later.');
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, coins: false }));
      }
    };

    fetchCoins();
  }, []);

  // Generate predictions when selected coin changes
  useEffect(() => {
    const fetchPredictionAndNews = async () => {
      if (!selectedCoin) return;
      
      setLoading(prev => ({ ...prev, prediction: true, news: true }));
      setError(null);
      
      try {
        // Generate predictions
        const newPrediction = await generatePredictions(selectedCoin);
        if (newPrediction) {
          setPrediction(newPrediction);
        } else {
          setError('Failed to generate predictions for this cryptocurrency.');
        }
        
        // Fetch news
        const coinNews = await getCoinNews(selectedCoin.id);
        setNews(coinNews);
      } catch (err) {
        setError('An error occurred while generating predictions.');
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, prediction: false, news: false }));
      }
    };

    fetchPredictionAndNews();
  }, [selectedCoin]);

  const handleCoinSelect = (coin: Coin) => {
    setSelectedCoin(coin);
  };

  const handleRefresh = async () => {
    if (!selectedCoin) return;
    
    setLoading(prev => ({ ...prev, prediction: true, news: true }));
    setError(null);
    
    try {
      // Refresh predictions
      const newPrediction = await generatePredictions(selectedCoin);
      if (newPrediction) {
        setPrediction(newPrediction);
      } else {
        setError('Failed to refresh predictions.');
      }
      
      // Refresh news
      const coinNews = await getCoinNews(selectedCoin.id);
      setNews(coinNews);
    } catch (err) {
      setError('An error occurred while refreshing data.');
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, prediction: false, news: false }));
    }
  };

  const timeframeButtons = [
    { key: 'nextWeek', label: '7 Days' },
    { key: 'nextMonth', label: '4 Weeks' },
    { key: 'nextYear', label: '12 Months' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp size={32} className="text-white mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-white">CryptoOracle</h1>
                <p className="text-blue-100 text-sm">AI-Powered Price Predictions</p>
              </div>
            </div>
            <div className="hidden md:block text-sm text-blue-100">
              Forecasting the future of digital assets
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 space-y-4 md:space-y-0">
          <CoinSelector
            coins={coins}
            selectedCoin={selectedCoin}
            onSelectCoin={handleCoinSelect}
            isLoading={loading.coins}
          />
          
          <button
            onClick={handleRefresh}
            disabled={loading.prediction || !selectedCoin}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={`mr-2 ${loading.prediction ? 'animate-spin' : ''}`} />
            Refresh Predictions
          </button>
        </div>
        
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {loading.coins ? (
          <LoadingState message="Loading cryptocurrencies..." />
        ) : (
          <>
            {prediction && !loading.prediction ? (
              <div className="space-y-8">
                <PredictionSummary prediction={prediction} />
                
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
                    <h2 className="text-xl font-semibold text-gray-800">Price Forecast</h2>
                    <div className="flex space-x-2">
                      {timeframeButtons.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setActiveTimeframe(key)}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            activeTimeframe === key
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <PriceChart
                    timeframe={prediction.predictions[activeTimeframe]}
                    coinName={prediction.coin.name}
                    coinSymbol={prediction.coin.symbol}
                  />
                </div>
                
                <NewsSection news={news} coinName={prediction.coin.name} />
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                {loading.prediction ? (
                  <LoadingState message="Generating predictions..." />
                ) : (
                  <p className="text-gray-500">
                    {selectedCoin
                      ? 'Failed to generate predictions. Please try again.'
                      : 'Select a cryptocurrency to view predictions.'}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              <strong>Disclaimer:</strong> This application provides price predictions for educational purposes only.
              Cryptocurrency investments are subject to high market risk. Past performance is not indicative of future results.
            </p>
            <p className="text-xs text-gray-400">
              Always conduct your own research before making investment decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;