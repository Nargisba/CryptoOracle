import React from 'react';
import { NewsItem } from '../types';
import { ExternalLink, MessageSquare } from 'lucide-react';

interface NewsSectionProps {
  news: NewsItem[];
  coinName: string;
}

const NewsSection: React.FC<NewsSectionProps> = ({ news, coinName }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <MessageSquare className="h-5 w-5 text-indigo-500 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">Latest {coinName} News</h2>
      </div>
      {news.length === 0 ? (
        <p className="text-gray-500">No news available at the moment.</p>
      ) : (
        <ul className="space-y-4">
          {news.map((item, index) => (
            <li key={index} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(
                    item.sentiment
                  )}`}
                >
                  {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                </span>
              </div>
              <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
                <span>{item.source} • {formatDate(item.publishedAt)}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Read more <ExternalLink size={14} className="ml-1" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NewsSection;