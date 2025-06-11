// Simple test to verify Raydium API is working
const testRaydiumAPI = async () => {
  console.log('Testing Raydium API...');
  
  try {
    // Test CP pools
    console.log('Fetching CP pools...');
    const cpResponse = await fetch('https://api.raydium.io/v2/main/pairs');
    const cpData = await cpResponse.json();
    console.log('CP Pools:', cpData.length, 'pools');
    
    // Find pools with good volume
    const goodVolumePools = cpData.filter(pool => pool.volume24h > 100);
    console.log('Pools with >$100 volume:', goodVolumePools.length);
    
    // Show first 5 good pools
    console.log('Sample pools:');
    goodVolumePools.slice(0, 5).forEach(pool => {
      console.log(`- ${pool.name}: $${pool.volume24h.toFixed(2)} volume, $${pool.price} price`);
    });
    
    // Test CLMM pools
    console.log('\nFetching CLMM pools...');
    const clmmResponse = await fetch('https://api.raydium.io/v2/ammV3/ammPools');
    const clmmData = await clmmResponse.json();
    console.log('CLMM Pools:', clmmData.data?.length || 0, 'pools');
    
    if (clmmData.data && clmmData.data.length > 0) {
      console.log('Sample CLMM pool:', clmmData.data[0]);
    }
    
  } catch (error) {
    console.error('Raydium API test failed:', error);
  }
};

// Run the test
testRaydiumAPI(); 