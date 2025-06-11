#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the deployment config file
const deploymentConfigPath = path.join(__dirname, '../src/config/deployment.ts');

// Read the current config
let configContent = fs.readFileSync(deploymentConfigPath, 'utf8');

// Update the deployment timestamp
const now = Date.now();
const nowDate = new Date().toISOString();

console.log('Updating deployment configuration...');
console.log('New deployment timestamp:', now);
console.log('New deployment date:', nowDate);

// Replace the deploymentTimestamp and deploymentDate
configContent = configContent.replace(
  /deploymentTimestamp: \d+/,
  `deploymentTimestamp: ${now}`
);

configContent = configContent.replace(
  /deploymentDate: '[^']*'/,
  `deploymentDate: '${nowDate}'`
);

// Write the updated config back
fs.writeFileSync(deploymentConfigPath, configContent);

console.log('✅ Deployment configuration updated successfully!');
console.log('This will force cache refresh for all users on the new deployment.');

// Also update package.json comment for reference
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.comment = `Deployment refresh - ${new Date().toISOString().split('T')[0]}`;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Package.json comment updated'); 