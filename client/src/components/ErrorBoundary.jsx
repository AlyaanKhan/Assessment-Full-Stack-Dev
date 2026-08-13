import { AlertTriangle } from 'lucide-react';
import { Component } from 'react';

// Catches any crash inside the app and shows a calm message instead of a blank page.
// Use this once, wrapped around the whole app.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasCrashed: false };
  }

  // Switches the boundary into its error state when a child throws.
  // React calls this for us; we never call it ourselves.
  static getDerivedStateFromError() {
    return { hasCrashed: true };
  }

  // Writes the crash to the console so a developer can find the cause.
  // React calls this for us after an error is caught.
  componentDidCatch(error, errorInformation) {
    console.error('The interface crashed:', error, errorInformation);
  }

  render() {
    if (this.state.hasCrashed) {
      return (
        <div className="centered-page">
          <div className="card empty-state">
            <AlertTriangle size={28} aria-hidden="true" />
            <h1 className="card-title">Something went wrong</h1>
            <p className="muted-text">
              The page ran into an unexpected problem. Reloading usually fixes it.
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
