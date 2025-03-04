import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { PredictionTimeframe } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PriceChartProps {
  timeframe: PredictionTimeframe;
  coinName: string;
  coinSymbol: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ timeframe, coinName, coinSymbol }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${coinName} (${coinSymbol.toUpperCase()}) Price Prediction - ${timeframe.label}`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Price: $${context.parsed.y.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
  };

  const data = {
    labels: timeframe.data.map((item) => item.date),
    datasets: [
      {
        label: 'Predicted Price',
        data: timeframe.data.map((item) => item.price),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.5)',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="bg-white p-4 rounded-lg">
      <Line options={options} data={data} />
    </div>
  );
};

export default PriceChart;