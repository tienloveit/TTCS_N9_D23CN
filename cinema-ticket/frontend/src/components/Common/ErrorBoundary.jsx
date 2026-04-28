import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          minHeight: '80vh'
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent)' }}>
            Opps! Có lỗi xảy ra
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Hệ thống gặp sự cố bất ngờ. Vui lòng thử tải lại trang hoặc quay lại sau.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
