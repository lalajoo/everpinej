import { Component, type ReactNode } from 'react';
export class SceneBoundary extends Component<{children: ReactNode; message: string; retry: string}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="no-webgl" role="alert"><p>{this.props.message}</p><button className="primary" onClick={() => window.location.reload()}>{this.props.retry}</button></div> : this.props.children;
  }
}
