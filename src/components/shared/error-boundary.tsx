import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-lg font-semibold">Algo deu errado</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a pagina.
          </p>
          {this.state.error && (
            <pre className="max-w-md overflow-x-auto rounded-lg bg-muted p-3 text-[10px] text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={() => window.location.reload()}>Recarregar</Button>
        </div>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }
