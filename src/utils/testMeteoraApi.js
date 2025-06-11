// Test script to verify Meteora API is working and returning real data
// Run this in browser console to test the API

const testMeteoraApi = async () => {
  console.log('Testing Meteora API...');
  
  try {
    // Test DLMM API
    console.log('Testing DLMM API...');
    const dlmmResponse = await fetch('https://dlmm-api.meteora.ag/pair/all');
    const dlmmData = await dlmmResponse.json();
    console.log(`DLMM API returned ${dlmmData.length} pools`);
    
    if (dlmmData.length > 0) {
      console.log('Sample DLMM pool:', dlmmData[0]);
    }
    
    // Test Universal Search API
    console.log('Testing Universal Search API...');
    const searchResponse = await fetch('https://universal-search-api.meteora.ag/pool/search?q=sol&per_page=5');
    const searchData = await searchResponse.json();
    console.log(`Search API returned ${searchData.hits?.length || 0} results`);
    
    if (searchData.hits && searchData.hits.length > 0) {
      console.log('Sample search result:', searchData.hits[0]);
    }
    
    // Test our internal API
    console.log('Testing internal Meteora service...');
    const { meteoraApi } = await import('../services/meteoraApi.ts');
    const coins = await meteoraApi.getMeteoraCoins(5);
    console.log(`Internal API returned ${coins.length} coins`);
    
    if (coins.length > 0) {
      console.log('Sample coin data:', coins[0]);
      
      // Check for mock data indicators
      const hasMockData = coins.some(coin => 
        coin.name?.includes('(Meteora)') ||
        coin.id?.includes('-meteora') ||
        (coin.symbol === 'sol' && Math.abs(coin.current_price - 95.50) < 0.01)
      );
      
      if (hasMockData) {
        console.error('❌ MOCK DATA DETECTED! The API is still returning mock data.');
      } else {
        console.log('✅ Real data detected! No mock data found.');
      }
    }
    
  } catch (error) {
    console.error('Error testing Meteora API:', error);
  }
};

// Export for use in console
window.testMeteoraApi = testMeteoraApi;

console.log('Meteora API test loaded. Run testMeteoraApi() in console to test.'); 