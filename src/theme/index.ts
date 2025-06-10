import { createTheme, ThemeOptions } from '@mui/material/styles';

// Material Design 3 Color System - Based on m3.material.io
export const getTheme = (mode: 'light' | 'dark') => {
  const isLight = mode === 'light';
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: '#6750A4',      // Primary-40
        light: isLight ? '#EADDFF' : '#D0BCFF',     // Primary-90 / Primary-80
        dark: isLight ? '#21005D' : '#4F378B',      // Primary-10 / Primary-30
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#625B71',      // Secondary-40
        light: isLight ? '#E8DEF8' : '#CCC2DC',     // Secondary-90 / Secondary-80
        dark: isLight ? '#1D192B' : '#4A4458',      // Secondary-10 / Secondary-30
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#BA1A1A',      // Error-40
        light: isLight ? '#FFDAD6' : '#FFDAD6',     // Error-90
        dark: isLight ? '#410002' : '#93000A',      // Error-10 / Error-20
        contrastText: '#FFFFFF',
      },
      warning: {
        main: '#825500',      // Warning-40
        light: isLight ? '#FFEDB1' : '#FFEDB1',     // Warning-90
        dark: isLight ? '#2A1800' : '#633F00',      // Warning-10 / Warning-20
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#006E1C',      // Success-40
        light: isLight ? '#A9F5A9' : '#A9F5A9',     // Success-90
        dark: isLight ? '#002204' : '#00390A',      // Success-10 / Success-20
        contrastText: '#FFFFFF',
      },
      background: {
        default: isLight ? '#FFFBFE' : '#1C1B1F',   // Surface / Surface-dark
        paper: isLight ? '#FFFBFE' : '#1C1B1F',     // Surface / Surface-dark
      },
      text: {
        primary: isLight ? '#1C1B1F' : '#E6E1E5',   // On-surface / On-surface-dark
        secondary: isLight ? '#49454F' : '#CAC4D0',  // On-surface-variant / On-surface-variant-dark
        disabled: isLight ? '#79747E' : '#938F99',   // Outline / Outline-dark
      },
      divider: isLight ? '#79747E' : '#938F99',     // Outline / Outline-dark
    },
    typography: {
      // Material Design 3 Typography Scale - Based on m3.material.io
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      
      // Display Large
      h1: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '3.5rem',    // 57px
        fontWeight: 400,
        lineHeight: '4rem',    // 64px
        letterSpacing: '-0.25px',
      },
      
      // Display Medium
      h2: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '2.8125rem', // 45px
        fontWeight: 400,
        lineHeight: '3.25rem', // 52px
        letterSpacing: '0px',
      },
      
      // Display Small
      h3: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '2.25rem',   // 36px
        fontWeight: 400,
        lineHeight: '2.75rem', // 44px
        letterSpacing: '0px',
      },
      
      // Headline Large
      h4: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '2rem',      // 32px
        fontWeight: 400,
        lineHeight: '2.5rem',  // 40px
        letterSpacing: '0px',
      },
      
      // Headline Medium
      h5: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1.75rem',   // 28px
        fontWeight: 400,
        lineHeight: '2.25rem', // 36px
        letterSpacing: '0px',
      },
      
      // Headline Small
      h6: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1.5rem',    // 24px
        fontWeight: 400,
        lineHeight: '2rem',    // 32px
        letterSpacing: '0px',
      },
      
      // Body Large
      body1: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '1rem',      // 16px
        fontWeight: 400,
        lineHeight: '1.5rem',  // 24px
        letterSpacing: '0.5px',
      },
      
      // Body Medium
      body2: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '0.875rem',  // 14px
        fontWeight: 400,
        lineHeight: '1.25rem', // 20px
        letterSpacing: '0.25px',
      },
      
      // Label Large
      button: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '0.875rem',  // 14px
        fontWeight: 500,
        lineHeight: '1.25rem', // 20px
        letterSpacing: '0.1px',
        textTransform: 'none' as const,
      },
      
      // Label Medium
      caption: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '0.75rem',   // 12px
        fontWeight: 500,
        lineHeight: '1rem',    // 16px
        letterSpacing: '0.5px',
      },
      
      // Label Small
      overline: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '0.6875rem', // 11px
        fontWeight: 500,
        lineHeight: '1rem',    // 16px
        letterSpacing: '0.5px',
        textTransform: 'uppercase' as const,
      },
    },
    shape: {
      borderRadius: 12, // Material Design 3 default corner radius
    },
    components: {
      // Material Design 3 Component Specifications - Based on m3.material.io
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isLight ? '#FFFBFE' : '#1C1B1F', // Surface
            boxShadow: isLight 
              ? '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)' 
              : '0px 1px 2px 0px rgba(0, 0, 0, 0.5), 0px 1px 3px 1px rgba(0, 0, 0, 0.25)', // Elevation 1
            border: 'none',
            '&:hover': {
              boxShadow: isLight 
                ? '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)' 
                : '0px 1px 3px 0px rgba(0, 0, 0, 0.5), 0px 4px 8px 3px rgba(0, 0, 0, 0.25)', // Elevation 2
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 20, // Full corner radius for buttons
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            letterSpacing: '0.1px',
            minHeight: 40,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 10,
            paddingBottom: 10,
          },
          contained: {
            backgroundColor: '#6750A4', // Primary
            color: '#FFFFFF',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: isLight ? '#7F67BE' : '#7F67BE', // Primary light
              boxShadow: isLight 
                ? '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)'
                : '0px 1px 2px 0px rgba(0, 0, 0, 0.5), 0px 1px 3px 1px rgba(0, 0, 0, 0.25)',
            },
            '&:active': {
              backgroundColor: isLight ? '#4F378B' : '#4F378B', // Primary dark
            },
          },
          outlined: {
            borderColor: isLight ? '#79747E' : '#938F99', // Outline
            color: '#6750A4', // Primary
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(103, 80, 164, 0.08)', // Primary with 8% opacity
              borderColor: '#6750A4',
            },
          },
          text: {
            color: '#6750A4', // Primary
            '&:hover': {
              backgroundColor: 'rgba(103, 80, 164, 0.08)', // Primary with 8% opacity
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: '0.875rem',
            letterSpacing: '0.1px',
            backgroundColor: isLight ? '#E8DEF8' : '#4A4458', // Secondary container
            color: isLight ? '#1D192B' : '#E8DEF8', // On secondary container
            border: 'none',
          },
          filled: {
            backgroundColor: isLight ? '#E8DEF8' : '#4A4458',
            color: isLight ? '#1D192B' : '#E8DEF8',
          },
          outlined: {
            borderColor: isLight ? '#79747E' : '#938F99',
            backgroundColor: 'transparent',
            color: isLight ? '#49454F' : '#CAC4D0',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#6750A4', // Primary
            color: '#FFFFFF',
            boxShadow: 'none',
            borderBottom: 'none',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 48,
          },
          indicator: {
            backgroundColor: isLight ? '#EADDFF' : '#D0BCFF', // Primary container
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            letterSpacing: '0.1px',
            minHeight: 48,
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-selected': {
              color: '#FFFFFF',
            },
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 4, // Small corner radius for text fields
              backgroundColor: isLight ? '#FFFBFE' : '#1C1B1F',
              '& fieldset': {
                borderColor: isLight ? '#79747E' : '#938F99', // Outline
              },
              '&:hover fieldset': {
                borderColor: isLight ? '#49454F' : '#CAC4D0', // On surface variant
              },
              '&.Mui-focused fieldset': {
                borderColor: '#6750A4', // Primary
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '1rem',
            fontWeight: 400,
            letterSpacing: '0.5px',
            color: isLight ? '#1C1B1F' : '#E6E1E5', // On surface
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? '#FFFBFE' : '#1C1B1F', // Surface
            borderRadius: 12,
          },
          elevation1: {
            boxShadow: isLight 
              ? '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)'
              : '0px 1px 2px 0px rgba(0, 0, 0, 0.5), 0px 1px 3px 1px rgba(0, 0, 0, 0.25)',
          },
          elevation2: {
            boxShadow: isLight 
              ? '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)'
              : '0px 1px 3px 0px rgba(0, 0, 0, 0.5), 0px 4px 8px 3px rgba(0, 0, 0, 0.25)',
          },
          elevation3: {
            boxShadow: isLight 
              ? '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)'
              : '0px 1px 3px 0px rgba(0, 0, 0, 0.5), 0px 4px 8px 3px rgba(0, 0, 0, 0.25)',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontSize: '0.875rem',
            fontWeight: 400,
            letterSpacing: '0.25px',
          },
          standardError: {
            backgroundColor: isLight ? '#FFDAD6' : '#93000A', // Error container
            color: isLight ? '#410002' : '#FFDAD6', // On error container
          },
          standardWarning: {
            backgroundColor: isLight ? '#FFEDB1' : '#633F00', // Warning container
            color: isLight ? '#2A1800' : '#FFEDB1', // On warning container
          },
          standardInfo: {
            backgroundColor: isLight ? '#4FFFDF' : '#004F52', // Info container
            color: isLight ? '#002020' : '#4FFFDF', // On info container
          },
          standardSuccess: {
            backgroundColor: isLight ? '#A9F5A9' : '#00390A', // Success container
            color: isLight ? '#002204' : '#A9F5A9', // On success container
          },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 16,
            paddingRight: 16,
            '@media (min-width: 600px)': {
              paddingLeft: 24,
              paddingRight: 24,
            },
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

// Default theme (dark mode)
const theme = getTheme('dark');

// Extend theme with custom Material Design 3 properties
declare module '@mui/material/styles' {
  interface Palette {
    tertiary?: Palette['primary'];
    surface?: {
      main: string;
      variant: string;
    };
    outline?: string;
    outlineVariant?: string;
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
    surface?: {
      main?: string;
      variant?: string;
    };
    outline?: string;
    outlineVariant?: string;
  }
}

export default theme; 