// DEX and network utilities
export interface DEXLink {
  name: string;
  url: string;
  icon?: string;
}

export const getDEXLinks = (contractAddress?: string, network?: string, symbol?: string): DEXLink[] => {
  const links: DEXLink[] = [];
  
  if (!contractAddress && !symbol) return links;
  
  switch (network?.toLowerCase()) {
    case 'ethereum':
      if (contractAddress) {
        links.push(
          { name: 'Uniswap', url: `https://app.uniswap.org/#/swap?outputCurrency=${contractAddress}` },
          { name: 'SushiSwap', url: `https://app.sushi.com/swap?outputCurrency=${contractAddress}` },
          { name: '1inch', url: `https://app.1inch.io/#/1/unified/swap/ETH/${contractAddress}` }
        );
      }
      break;
      
    case 'bnb chain':
    case 'binance smart chain':
      if (contractAddress) {
        links.push(
          { name: 'PancakeSwap', url: `https://pancakeswap.finance/swap?outputCurrency=${contractAddress}` },
          { name: 'BiSwap', url: `https://biswap.org/swap?outputCurrency=${contractAddress}` }
        );
      }
      break;
      
    case 'polygon':
      if (contractAddress) {
        links.push(
          { name: 'QuickSwap', url: `https://quickswap.exchange/#/swap?outputCurrency=${contractAddress}` },
          { name: 'SushiSwap', url: `https://app.sushi.com/swap?outputCurrency=${contractAddress}` }
        );
      }
      break;
      
    case 'avalanche':
      if (contractAddress) {
        links.push(
          { name: 'Trader Joe', url: `https://traderjoexyz.com/trade?outputCurrency=${contractAddress}` },
          { name: 'Pangolin', url: `https://app.pangolin.exchange/#/swap?outputCurrency=${contractAddress}` }
        );
      }
      break;
      
    case 'solana':
      if (contractAddress) {
        links.push(
          { name: 'Raydium', url: `https://raydium.io/swap/?outputCurrency=${contractAddress}` },
          { name: 'Jupiter', url: `https://jup.ag/swap/SOL-${contractAddress}` }
        );
      }
      break;
      
    case 'fantom':
      if (contractAddress) {
        links.push(
          { name: 'SpookySwap', url: `https://spookyswap.finance/swap?outputCurrency=${contractAddress}` },
          { name: 'SpiritSwap', url: `https://app.spiritswap.finance/#/swap?outputCurrency=${contractAddress}` }
        );
      }
      break;
      
    case 'arbitrum':
      if (contractAddress) {
        links.push(
          { name: 'Uniswap', url: `https://app.uniswap.org/#/swap?outputCurrency=${contractAddress}&chain=arbitrum` },
          { name: 'SushiSwap', url: `https://app.sushi.com/swap?outputCurrency=${contractAddress}` }
        );
      }
      break;
      
    case 'optimism':
      if (contractAddress) {
        links.push(
          { name: 'Uniswap', url: `https://app.uniswap.org/#/swap?outputCurrency=${contractAddress}&chain=optimism` },
          { name: 'Velodrome', url: `https://app.velodrome.finance/swap?from=eth&to=${contractAddress}` }
        );
      }
      break;
  }
  
  // Add centralized exchanges for major coins
  if (symbol) {
    const majorCoins = ['btc', 'eth', 'bnb', 'ada', 'sol', 'matic', 'avax', 'dot', 'link', 'uni'];
    if (majorCoins.includes(symbol.toLowerCase())) {
      links.push(
        { name: 'Binance', url: `https://www.binance.com/en/trade/${symbol.toUpperCase()}_USDT` },
        { name: 'Coinbase', url: `https://pro.coinbase.com/trade/${symbol.toUpperCase()}-USD` }
      );
    }
  }
  
  return links;
};

export const getNetworkExplorer = (contractAddress: string, network?: string): string | undefined => {
  if (!contractAddress || !network) return undefined;
  
  switch (network.toLowerCase()) {
    case 'ethereum':
      return `https://etherscan.io/token/${contractAddress}`;
    case 'bnb chain':
    case 'binance smart chain':
      return `https://bscscan.com/token/${contractAddress}`;
    case 'polygon':
      return `https://polygonscan.com/token/${contractAddress}`;
    case 'avalanche':
      return `https://snowtrace.io/token/${contractAddress}`;
    case 'fantom':
      return `https://ftmscan.com/token/${contractAddress}`;
    case 'arbitrum':
      return `https://arbiscan.io/token/${contractAddress}`;
    case 'optimism':
      return `https://optimistic.etherscan.io/token/${contractAddress}`;
    case 'solana':
      return `https://solscan.io/token/${contractAddress}`;
    default:
      return undefined;
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

export const formatContractAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}; 