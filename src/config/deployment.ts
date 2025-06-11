// Deployment configuration
// This file tracks deployment versions to force cache refresh on new deployments

export const DEPLOYMENT_CONFIG = {
  // Update this timestamp with each deployment to force cache refresh
  deploymentTimestamp: Date.now(),
  deploymentVersion: '1.1.0',
  deploymentDate: new Date().toISOString(),
  
  // Cache version - increment this to force complete cache invalidation
  cacheVersion: 'v1.1.0-no-mock-data'
};

export const getDeploymentId = (): string => {
  return `${DEPLOYMENT_CONFIG.deploymentVersion}-${DEPLOYMENT_CONFIG.deploymentTimestamp}`;
};

export const shouldForceRefresh = (): boolean => {
  try {
    const storedDeploymentId = localStorage.getItem('cryptosage-deployment-id');
    const currentDeploymentId = getDeploymentId();
    
    if (!storedDeploymentId || storedDeploymentId !== currentDeploymentId) {
      console.log('New deployment detected, forcing cache refresh');
      localStorage.setItem('cryptosage-deployment-id', currentDeploymentId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking deployment version:', error);
    return false;
  }
}; 