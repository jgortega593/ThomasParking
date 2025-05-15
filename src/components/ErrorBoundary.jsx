// src/components/ErrorBoundary.jsx
import React from 'react'
import PropTypes from 'prop-types'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar la UI de repuesto
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Puedes loguear el error a un servicio externo aquí
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary atrapó un error:', error, errorInfo)
    }
    this.setState({ errorInfo })
    // Ejemplo: enviar a un servicio externo
    // logErrorToService(error, errorInfo)
  }

  handleRetry = () => {
    // Restablece el estado para intentar renderizar de nuevo
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // UI de repuesto personalizada
      return (
        <div className="max-w-lg mx-auto my-16 p-8 bg-red-50 dark:bg-red-900 rounded-lg shadow border border-red-200 dark:border-red-800 text-center">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-100 mb-2">
            ¡Algo salió mal!
          </h2>
          {this.state.error && (
            <p className="text-red-600 dark:text-red-300 mb-4">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="mt-4 px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
          {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
            <details className="mt-4 text-xs text-left text-red-500 whitespace-pre-wrap">
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
}
