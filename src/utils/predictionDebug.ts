import { predictionTracker } from '../services/predictionTracker';

// Debug utilities for prediction tracking
export const predictionDebug = {
  // Check current state
  checkState: () => {
    console.log('=== PREDICTION TRACKER STATE ===');
    
    const records = predictionTracker.getPredictionRecords();
    const stats = predictionTracker.getAccuracyStats();
    const histories = predictionTracker.getCoinHistories();
    
    console.log(`Records: ${records.length}`);
    console.log(`Stats:`, stats);
    console.log(`Histories: ${histories.length}`);
    
    if (records.length > 0) {
      const now = Date.now();
      const eligibleFor1h = records.filter(r => (now - r.predictionTimestamp) >= 60 * 60 * 1000);
      const eligibleFor4h = records.filter(r => (now - r.predictionTimestamp) >= 4 * 60 * 60 * 1000);
      const eligibleFor24h = records.filter(r => (now - r.predictionTimestamp) >= 24 * 60 * 60 * 1000);
      
      console.log(`Eligible for 1h update: ${eligibleFor1h.length}`);
      console.log(`Eligible for 4h update: ${eligibleFor4h.length}`);
      console.log(`Eligible for 24h update: ${eligibleFor24h.length}`);
      
      // Show sample record
      console.log('Sample record:', records[0]);
    }
    
    console.log('=== END STATE ===');
  },
  
  // Manually trigger update
  manualUpdate: async () => {
    console.log('Triggering manual update...');
    await predictionTracker.manualUpdate();
    console.log('Manual update completed');
  },
  
  // Clear all data
  clearAll: () => {
    predictionTracker.clearAllData();
    console.log('All prediction data cleared');
  },
  
  // Create fake old predictions for testing
  createTestPredictions: () => {
    const testAnalyses = [
      {
        coin: {
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 50000
        },
        predictions: {
          '1h': 2.5,
          '4h': 5.0,
          '24h': 10.0,
          '7d': 15.0
        },
        confidence: 75,
        recommendation: 'LONG' as const,
        overallScore: 8.5
      }
    ];
    
    // Save with timestamp 2 hours ago
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    const records = testAnalyses.map(analysis => ({
      id: `${analysis.coin.id}_${twoHoursAgo}`,
      coinId: analysis.coin.id,
      coinSymbol: analysis.coin.symbol,
      coinName: analysis.coin.name,
      timestamp: twoHoursAgo,
      predictionTimestamp: twoHoursAgo,
      originalPrice: analysis.coin.current_price,
      predictions: analysis.predictions,
      confidence: analysis.confidence,
      recommendation: analysis.recommendation,
      overallScore: analysis.overallScore,
      actualPrices: {},
      actualChanges: {},
      accuracyScores: {},
      isComplete: false,
      lastUpdated: twoHoursAgo
    }));
    
    localStorage.setItem('cryptosage_prediction_records', JSON.stringify(records));
    console.log('Test predictions created (2 hours old)');
  }
};

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).predictionDebug = predictionDebug;
} 