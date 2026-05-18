import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error no controlado en la aplicacion', error, errorInfo);
  }

  private resetApp = () => {
    try {
      window.localStorage.removeItem('monitor-impacto-social:v2');
    } catch {
      // El navegador puede bloquear localStorage en algunos modos privados.
    }

    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-fallback" role="alert">
        <div className="app-fallback-panel">
          <p className="eyebrow">Recuperacion automatica</p>
          <h1>No se pudo restaurar la vista guardada</h1>
          <p>
            El navegador tenia una configuracion anterior incompatible. Restablece la
            sesion local para cargar el monitor con valores seguros.
          </p>
          <button className="primary-button" type="button" onClick={this.resetApp}>
            Restablecer y recargar
          </button>
        </div>
      </div>
    );
  }
}
