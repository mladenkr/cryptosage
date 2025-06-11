import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Toolbar,
  Typography,
  IconButton,
  Box,
  AppBar,
  Button,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Container
} from '@mui/material';
import {
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems: { label: string; path: string }[] = [
    { label: 'AI Analysis', path: '/' },
    { label: 'Basic Dashboard', path: '/basic-dashboard' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const MobileDrawer = () => (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      PaperProps={{
        sx: {
          width: 280,
          backgroundColor: theme.palette.background.paper,
        }
      }}
    >
      <Box sx={{ pt: 3, pb: 2 }}>
        {/* Logo in mobile drawer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 3,
            mb: 3,
            cursor: 'pointer',
          }}
          onClick={() => handleNavigation('/')}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              color: theme.palette.primary.main,
            }}
          >
            CryptoSage
          </Typography>
        </Box>
        
        <List sx={{ px: 1 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActivePath(item.path)}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: isActivePath(item.path) ? 600 : 400,
                    color: isActivePath(item.path) ? '#ffffff' : theme.palette.text.primary
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  return (
    <>
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
              {isMobile && (
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label="menu"
                  onClick={() => setMobileMenuOpen(true)}
                  sx={{ mr: 2 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mr: { xs: 2, md: 4 }
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
                  CryptoSage
                </Typography>
              </Box>

              {!isMobile && (
                <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                  {navigationItems.map((item) => (
                    <Button
                      key={item.path}
                      color="inherit"
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 3,
                        py: 1,
                        fontSize: '0.9rem',
                        fontWeight: isActivePath(item.path) ? 600 : 500,
                        color: '#ffffff',
                        backgroundColor: isActivePath(item.path) ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          transform: 'translateY(-1px)',
                          transition: 'all 0.2s ease-in-out'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    display: { xs: 'none', sm: 'block' },
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  Powered by AI & Real APIs
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>
        </Container>
      </Box>
      
      {isMobile && <MobileDrawer />}
    </>
  );
};

export default Header; 