import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-4 rounded-3xl border border-destructive/20 bg-destructive/5 text-center space-y-4 max-w-xl mx-auto shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif-display text-xl text-ink font-semibold">
              {this.props.fallbackTitle || "Something went wrong loading this panel"}
            </h3>
            <p className="text-xs text-ink-soft">
              {this.props.fallbackDescription ||
                "A temporary error occurred while rendering data. You can retry or refresh to continue."}
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] font-mono text-destructive bg-destructive/10 p-2 rounded-lg break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              onClick={this.handleReset}
              className="bg-forest text-paper hover:bg-forest/90 text-xs px-4 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-xs px-4"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
