import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { parseCsvFile, type ParsedCsv } from '@/lib/csv-parser'

interface UploadStepProps {
  onNext: (csv: ParsedCsv) => void
}

const UploadStep = ({ onNext }: UploadStepProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Selecione um arquivo .csv')
      return
    }

    setFile(f)
    setParsing(true)
    try {
      const result = await parseCsvFile(f)
      if (result.totalRows === 0) {
        toast.error('Arquivo CSV sem dados (apenas cabeçalho)')
        setFile(null)
        setParsedCsv(null)
        return
      }
      setParsedCsv(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ler arquivo')
      setFile(null)
      setParsedCsv(null)
    } finally {
      setParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    if (inputRef.current) inputRef.current.value = ''
  }, [handleFile])

  const clear = () => {
    setFile(null)
    setParsedCsv(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-smooth cursor-pointer',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Arraste um arquivo CSV ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">Tamanho maximo: 10MB</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(file.size)}
              {parsedCsv && ` · ${parsedCsv.totalRows} linhas · ${parsedCsv.headers.length} colunas`}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />

      <div className="flex justify-end">
        <Button onClick={() => parsedCsv && onNext(parsedCsv)} disabled={!parsedCsv || parsing}>
          Proximo
        </Button>
      </div>
    </div>
  )
}

export { UploadStep }
