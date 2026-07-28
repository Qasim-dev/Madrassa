import { Component } from 'react'
import { withTranslation } from 'react-i18next'

class ErrorBoundaryInner extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      const { t, i18n } = this.props
      const isUr = i18n?.language === 'ur'
      return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: 'var(--ds-bg, #f7f6f3)' }}>
          <div className="content-panel p-4 text-center" style={{ maxWidth: 420 }} role="alert">
            <h1 className="h4 mb-2">
              {t?.('errors.boundaryTitle') || (isUr ? 'کچھ غلط ہو گیا' : 'Something went wrong')}
            </h1>
            <p className="text-muted mb-3">
              {t?.('errors.boundaryBody') ||
                (isUr
                  ? 'صفحہ دوبارہ لوڈ کریں یا ڈیش بورڈ پر واپس جائیں۔'
                  : 'Please reload the page or return to the dashboard.')}
            </p>
            <button type="button" className="btn btn-success" onClick={this.handleReload}>
              {t?.('errors.boundaryAction') || (isUr ? 'ڈیش بورڈ' : 'Go to dashboard')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const ErrorBoundary = withTranslation()(ErrorBoundaryInner)
export default ErrorBoundary
