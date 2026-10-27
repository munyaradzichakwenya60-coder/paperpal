import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { failed: boolean };

/** Catches unexpected rendering errors so teachers see a calm message, never a stack trace. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PaperPal crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="crash" role="alert">
          <h1>Something went wrong</h1>
          <p>PaperPal ran into an unexpected problem. Reload the page to try again. Your profile is saved on this device.</p>
          <button type="button" className="generate" onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
