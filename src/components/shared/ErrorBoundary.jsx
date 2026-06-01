import { Component } from 'react';

/**
 * ErrorBoundary — two variants:
 *
 *  <ErrorBoundary>                — full-screen fallback (app root in main.jsx)
 *  <ErrorBoundary variant="page"> — inline card fallback (per-route in AppRouter)
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.variant === 'page') {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">⚠️</span>
            </div>
            <p className="text-base font-bold text-gray-800 mb-1">
              This page ran into a problem
            </p>
            <p className="text-sm text-gray-400 mb-5">
              The rest of the application is still working. You can try reloading this section.
            </p>
            <button
              onClick={this.handleReset}
              className="px-5 py-2 bg-[#001F3F] text-white rounded-xl text-sm font-bold hover:bg-[#002d5c] transition-all"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    // Full-screen fallback — root level only
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-xl font-bold text-gray-800 mb-2">Something went wrong</p>
          <p className="text-gray-500 text-sm mb-6">
            An unexpected error occurred. Please reload the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#001F3F] text-white rounded-xl font-bold hover:bg-[#002d5c] transition-all"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
