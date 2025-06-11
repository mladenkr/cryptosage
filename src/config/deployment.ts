// Deployment configuration
// This file tracks deployment versions to force cache refresh on new deployments

export const DEPLOYMENT_CONFIG = {
  // Update this timestamp with each deployment to force cache refresh
  deploymentTimestamp: 1749659887757,
  deploymentVersion: '1.0.0',
  deploymentDate: '2025-06-11T16:38:07.757Z',
  
  // Cache version - increment this to force complete cache invalidation
  cacheVersion: 'v1.0.0'
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