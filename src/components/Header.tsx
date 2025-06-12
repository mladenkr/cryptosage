import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Toolbar,
  Typography,
  Box,
  AppBar,
  Container
} from '@mui/material';


const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 2, pb: 1 }}>
      <Container maxWidth="lg" sx={{ px: 0 }}>
        <AppBar 
          position="static" 
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                flexGrow: 1,
                justifyContent: 'center'
              }}
              onClick={() => navigate('/')}
            >
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                CryptoSage - Enhanced AI Analysis
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
      </Container>
    </Box>
  );
};

export default Header; 