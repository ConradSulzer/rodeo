import { useRef, useState, type ChangeEvent } from 'react'
import { Button, type ButtonProps } from '@renderer/components/ui/button'
import { toast } from 'sonner'
import { PlayerImportModal } from './PlayerImportModal'

export type PlayerImportButtonProps = Omit<ButtonProps, 'onClick'>

export function PlayerImportButton(buttonProps: PlayerImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (buttonProps.disabled) return
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

  const handleComplete = (success: boolean) => {
    if (success) {
      toast.success('Players imported successfully')
    } else {
      toast.error('Import finished with errors')
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" {...buttonProps} onClick={handleClick}>
        Import Players
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <PlayerImportModal
        open={open}
        file={file}
        onClose={handleClose}
        onComplete={handleComplete}
      />
    </>
  )
}
