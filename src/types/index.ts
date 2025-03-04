export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
}

export interface PredictionData {
  date: string;
  price: number;
}

export interface PredictionTimeframe {
  label: string;
  data: PredictionData[];
}

export interface CoinPrediction {
  coin: Coin;
  predictions: {
    nextWeek: PredictionTimeframe;
    nextMonth: PredictionTimeframe;
    nextYear: PredictionTimeframe;
  };
  lastUpdated: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}