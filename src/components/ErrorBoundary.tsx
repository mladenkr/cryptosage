import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Container } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong!
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              The application encountered an unexpected error. Please try reloading the page.
            </Typography>
            {this.state.error && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 2 }}>
                Error: {this.state.error.message}
              </Typography>
            )}
            <Button variant="contained" onClick={this.handleReload}>
              Reload Page
            </Button>
          </Alert>
          
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Error Details (Development Only):
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo.componentStack}
              </Typography>
            </Box>
          )}
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 