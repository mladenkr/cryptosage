# Stablecoin Filtering Enhancement

## Problem
The app was recommending stablecoins (USDT, USDC, DAI, etc.) which have minimal price fluctuations and are not useful for trading recommendations.

## Solution Implemented
Enhanced the MEXC API service (`src/services/mexcApi.ts`) with comprehensive stablecoin filtering:

### 1. Symbol-Based Filtering
- Added comprehensive list of 25+ known stablecoin symbols
- Filters out: USDT, USDC, BUSD, DAI, TUSD, FRAX, LUSD, USDD, USDP, GUSD, HUSD, SUSD, CUSD, OUSD, MUSD, DUSD, YUSD, RUSD, NUSD, USDN, USTC, UST, VAI, MIM, FEI, TRIBE, RAI, FLOAT, EURC, EURS, EURT, GBPT, JPYC, CADC, AUDC, NZDS, PAXG, XAUT, DGLD, PMGT, CACHE, USDX, USDK, USDS, USDJ

### 2. Pattern-Based Filtering
- Filters coins with names containing: 'usd', 'dollar', 'stable', 'peg'
- Catches stablecoins that might not be in the explicit list

### 3. Wrapped & Staked Token Filtering
- Filters out wrapped tokens: WETH, WBTC, WBNB, WMATIC, WAVAX, WFTM, WSOL
- Filters out staked tokens: STETH, RETH, CBETH, SFRXETH, STMATIC, STSOL
- Pattern-based filtering for tokens starting with 'w' followed by major crypto names
- Filters tokens containing 'staked' or 'liquid'

### 4. Price Stability Filtering
- Filters coins priced near $1 (0.95-1.05) with <2% daily change
- Filters fiat-pegged coins with minimal volatility
- Catches EUR-pegged (~0.75-0.95) and CNY-pegged (~6.5-7.5) stablecoins

## Impact
- Eliminates stablecoins from recommendations completely
- Focuses on volatile cryptocurrencies with actual trading potential
- Provides better, more actionable trading recommendations
- Improves user experience by removing pointless recommendations

## Cache Clearing
The browser cache will automatically refresh with new data. If you want to see the changes immediately, you can:
1. Refresh the page
2. Or wait for the next automatic data refresh (every 5 minutes)

## Logging
The console now shows detailed filtering statistics:
- Initial tickers count
- Number of stablecoins filtered out
- Final count after all filters
- Top 10 coins by volume for verification 