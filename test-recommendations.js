const { cryptoAnalyzer } = require('./src/services/technicalAnalysis');

async function testRecommendations() {
  console.log('Testing recommendation system...');
  
  try {
    const recommendations = await cryptoAnalyzer.getTop10Recommendations();
    
    console.log(`\n✅ Received ${recommendations.length} recommendations`);
    
    if (recommendations.length === 10) {
      console.log('✅ SUCCESS: Exactly 10 recommendations returned!');
    } else {
      console.log(`❌ ISSUE: Expected 10 recommendations, got ${recommendations.length}`);
    }
    
    console.log('\nRecommendation details:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.coin.name} (${rec.coin.symbol}) - ${rec.recommendation} - Score: ${rec.overallScore.toFixed(1)}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing recommendations:', error);
  }
}

testRecommendations(); 