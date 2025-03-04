import axios from 'axios';
import { Coin, CoinPrediction, NewsItem, PredictionData } from '../types';

// CoinGecko API base URL
const API_BASE_URL = 'https://api.coingecko.com/api/v3';

// Get list of coins from CoinGecko
export const getCoins = async (): Promise<Coin[]> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`
    );
    
    // Add PI Network manually since it might not be in CoinGecko API
    const piNetwork: Coin = {
      id: 'pi-network',
      symbol: 'pi',
      name: 'PI Network',
      image: 'https://cryptologos.cc/logos/pi-network-pi-logo.png',
      current_price: 0.42, // Estimated value as PI is not widely traded yet
      market_cap: 0,
      market_cap_rank: 0,
      price_change_percentage_24h: 0.5,
    };
    
    // Add PI Network to the beginning of the array for visibility
    return [piNetwork, ...response.data];
  } catch (error) {
    console.error('Error fetching coins:', error);
    return [];
  }
};

// Get historical data for a specific coin
export const getCoinHistoricalData = async (coinId: string, days: number): Promise<any> => {
  try {
    // Special case for PI Network which isn't on exchanges yet
    if (coinId === 'pi-network') {
      // Generate mock historical data for PI Network
      const prices: [number, number][] = [];
      const volumes: [number, number][] = [];
      const market_caps: [number, number][] = [];
      
      const now = Date.now();
      const dayMs = 86400000; // milliseconds in a day
      
      // Generate data points for each day
      for (let i = days; i >= 0; i--) {
        const timestamp = now - (i * dayMs);
        // Simulate a slightly upward trend with some volatility
        const basePrice = 0.4;
        const randomFactor = 1 + (Math.random() * 0.1 - 0.05); // -5% to +5%
        const trendFactor = 1 + (0.001 * (days - i)); // Slight upward trend
        const price = basePrice * randomFactor * trendFactor;
        
        prices.push([timestamp, price]);
        volumes.push([timestamp, Math.random() * 10000000]);
        market_caps.push([timestamp, price * 100000000]);
      }
      
      return { prices, volumes, market_caps };
    }
    
    // For other coins, fetch from API
    const response = await axios.get(
      `${API_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching historical data for ${coinId}:`, error);
    return null;
  }
};

// Mock function to get news for a specific coin
// In a real app, you would integrate with a news API
export const getCoinNews = async (coinId: string): Promise<NewsItem[]> => {
  // Special case for PI Network
  if (coinId === 'pi-network') {
    return [
      {
        title: "PI Network approaches mainnet launch with growing community support",
        url: '#',
        source: 'CryptoInsider',
        publishedAt: new Date().toISOString(),
        sentiment: 'positive',
      },
      {
        title: "PI Network's unique mining approach attracts millions of mobile users",
        url: '#',
        source: 'BlockchainReport',
        publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        sentiment: 'positive',
      },
      {
        title: "Analysts debate PI Network's potential value upon exchange listing",
        url: '#',
        source: 'CryptoNews',
        publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        sentiment: 'neutral',
      },
    ];
  }
  
  // For other coins
  const mockNews: NewsItem[] = [
    {
      title: `${coinId.charAt(0).toUpperCase() + coinId.slice(1)} shows promising growth potential`,
      url: '#',
      source: 'CryptoNews',
      publishedAt: new Date().toISOString(),
      sentiment: 'positive',
    },
    {
      title: `Market analysts predict stability for ${coinId.charAt(0).toUpperCase() + coinId.slice(1)}`,
      url: '#',
      source: 'BlockchainReport',
      publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      sentiment: 'neutral',
    },
    {
      title: `New developments in ${coinId.charAt(0).toUpperCase() + coinId.slice(1)} ecosystem`,
      url: '#',
      source: 'CoinInsider',
      publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      sentiment: 'positive',
    },
  ];

  return mockNews;
};

// Generate price predictions based on historical data and news sentiment
// This is a simplified mock implementation
export const generatePredictions = async (coin: Coin): Promise<CoinPrediction | null> => {
  try {
    // Get historical data for the last 365 days
    const historicalData = await getCoinHistoricalData(coin.id, 365);
    
    if (!historicalData || !historicalData.prices || historicalData.prices.length === 0) {
      return null;
    }
    
    // Get news for sentiment analysis
    const news = await getCoinNews(coin.id);
    
    // Calculate sentiment score (simplified)
    const sentimentScore = news.reduce((score, item) => {
      if (item.sentiment === 'positive') return score + 0.05;
      if (item.sentiment === 'negative') return score - 0.03;
      return score;
    }, 0);
    
    // Get current price
    const currentPrice = coin.current_price;
    
    // Special case for PI Network - more optimistic predictions
    const isPiNetwork = coin.id === 'pi-network';
    const piBoostFactor = isPiNetwork ? 1.5 : 1;
    
    // Generate predictions (this is a simplified model)
    // In a real app, you would use more sophisticated prediction models
    
    // Next 7 days predictions
    const nextWeekData: PredictionData[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      
      // Simple prediction model: current price + random fluctuation + sentiment influence
      const randomFactor = 1 + (Math.random() * 0.04 - 0.02); // -2% to +2%
      const sentimentFactor = 1 + (sentimentScore * (i + 1) / 10); // Increasing influence over time
      const predictedPrice = currentPrice * randomFactor * sentimentFactor * (isPiNetwork ? (1 + (i * 0.01 * piBoostFactor)) : 1);
      
      return {
        date: date.toISOString().split('T')[0],
        price: Number(predictedPrice.toFixed(2)),
      };
    });
    
    // Weekly predictions for a month
    const nextMonthData: PredictionData[] = Array.from({ length: 4 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + (i + 1) * 7);
      
      const randomFactor = 1 + (Math.random() * 0.08 - 0.04); // -4% to +4%
      const sentimentFactor = 1 + (sentimentScore * (i + 1) / 8);
      const predictedPrice = currentPrice * randomFactor * sentimentFactor * (isPiNetwork ? (1 + (i * 0.03 * piBoostFactor)) : 1);
      
      return {
        date: date.toISOString().split('T')[0],
        price: Number(predictedPrice.toFixed(2)),
      };
    });
    
    // Monthly predictions for a year
    const nextYearData: PredictionData[] = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      
      const randomFactor = 1 + (Math.random() * 0.15 - 0.07); // -7% to +8%
      const sentimentFactor = 1 + (sentimentScore * (i + 1) / 6);
      const predictedPrice = currentPrice * randomFactor * sentimentFactor * (isPiNetwork ? (1 + (i * 0.08 * piBoostFactor)) : 1);
      
      return {
        date: date.toISOString().split('T')[0],
        price: Number(predictedPrice.toFixed(2)),
      };
    });
    
    return {
      coin,
      predictions: {
        nextWeek: {
          label: 'Next 7 Days',
          data: nextWeekData,
        },
        nextMonth: {
          label: 'Next 4 Weeks',
          data: nextMonthData,
        },
        nextYear: {
          label: 'Next 12 Months',
          data: nextYearData,
        },
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error generating predictions for ${coin.id}:`, error);
    return null;
  }
};