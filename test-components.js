// Simple test to verify components can be imported
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Component Implementations...\n');

// Test 1: Check if all component files exist
const components = [
  'src/components/PortfolioOptimizer.tsx',
  'src/components/InteractiveCharts.tsx',
  'src/components/MarketHeatmap.tsx',
  'src/components/SmartAlerts.tsx'
];

const services = [
  'src/services/portfolioOptimization.ts',
  'src/services/interactiveCharts.ts',
  'src/services/heatmapService.ts',
  'src/services/smartAlerts.ts'
];

console.log('📁 Checking component files...');
components.forEach(component => {
  if (fs.existsSync(component)) {
    console.log(`✅ ${component} exists`);
  } else {
    console.log(`❌ ${component} missing`);
  }
});

console.log('\n📁 Checking service files...');
services.forEach(service => {
  if (fs.existsSync(service)) {
    console.log(`✅ ${service} exists`);
  } else {
    console.log(`❌ ${service} missing`);
  }
});

// Test 2: Check if components have proper exports
console.log('\n🔍 Checking component exports...');
components.forEach(component => {
  try {
    const content = fs.readFileSync(component, 'utf8');
    if (content.includes('export default')) {
      console.log(`✅ ${component} has default export`);
    } else {
      console.log(`⚠️  ${component} missing default export`);
    }
  } catch (error) {
    console.log(`❌ Error reading ${component}: ${error.message}`);
  }
});

// Test 3: Check if services have proper exports
console.log('\n🔍 Checking service exports...');
services.forEach(service => {
  try {
    const content = fs.readFileSync(service, 'utf8');
    if (content.includes('export') && (content.includes('Service') || content.includes('service'))) {
      console.log(`✅ ${service} has service export`);
    } else {
      console.log(`⚠️  ${service} missing service export`);
    }
  } catch (error) {
    console.log(`❌ Error reading ${service}: ${error.message}`);
  }
});

// Test 4: Check if App.tsx includes all routes
console.log('\n🛣️  Checking App.tsx routes...');
try {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const routes = [
    '/portfolio-optimizer',
    '/charts/',
    '/heatmap',
    '/alerts'
  ];
  
  routes.forEach(route => {
    if (appContent.includes(route)) {
      console.log(`✅ Route ${route} found in App.tsx`);
    } else {
      console.log(`❌ Route ${route} missing from App.tsx`);
    }
  });
} catch (error) {
  console.log(`❌ Error reading App.tsx: ${error.message}`);
}

// Test 5: Check if Header.tsx includes navigation
console.log('\n🧭 Checking Header.tsx navigation...');
try {
  const headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8');
  const navItems = [
    'Portfolio Optimizer',
    'Market Heatmap',
    'Smart Alerts'
  ];
  
  navItems.forEach(item => {
    if (headerContent.includes(item)) {
      console.log(`✅ Navigation item "${item}" found in Header.tsx`);
    } else {
      console.log(`❌ Navigation item "${item}" missing from Header.tsx`);
    }
  });
} catch (error) {
  console.log(`❌ Error reading Header.tsx: ${error.message}`);
}

console.log('\n🎉 Component test completed!');
console.log('\n💡 To test functionality:');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Navigate to each page using the header menu:');
console.log('   - Portfolio Optimizer: /portfolio-optimizer');
console.log('   - Market Heatmap: /heatmap');
console.log('   - Smart Alerts: /alerts');
console.log('   - Interactive Charts: /charts/bitcoin/BTC (example)');
console.log('3. Check browser console for any errors');
console.log('4. Test API data loading and component interactions'); 