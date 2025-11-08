import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@renderer/components/ui/button'
import { SettingsImportModal } from './SettingsImportModal'

export function SettingsImportButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setOpen(true)
    event.target.value = ''
  }

  const handleClose = () => {
    setOpen(false)
    setFile(null)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick}>
        Import Settings
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <SettingsImportModal open={open} file={file} onClose={handleClose} />
    </>
  )
}
