'use client'

import { useEffect } from 'react'
import { type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RichEditorProps {
  content: string
  onChange?: (html: string) => void
  editable?: boolean
  className?: string
}

function toolbarButton(
  active: boolean,
  onClick: () => void,
  icon: ReactNode,
  label: string
) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="icon"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </Button>
  )
}

export function RichEditor({
  content,
  onChange,
  editable = true,
  className,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editable,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML())
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      {editable && (
        <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-1">
          {toolbarButton(
            editor.isActive('bold'),
            () => editor.chain().focus().toggleBold().run(),
            <Bold className="h-4 w-4" />,
            'Gras'
          )}
          {toolbarButton(
            editor.isActive('italic'),
            () => editor.chain().focus().toggleItalic().run(),
            <Italic className="h-4 w-4" />,
            'Italique'
          )}
          {toolbarButton(
            editor.isActive('underline'),
            () => editor.chain().focus().toggleUnderline().run(),
            <UnderlineIcon className="h-4 w-4" />,
            'Souligné'
          )}

          <div className="w-px h-5 bg-border mx-1 self-center" />

          {toolbarButton(
            editor.isActive('heading', { level: 1 }),
            () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            <span className="text-xs font-bold">H1</span>,
            'Titre 1'
          )}
          {toolbarButton(
            editor.isActive('heading', { level: 2 }),
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            <span className="text-xs font-bold">H2</span>,
            'Titre 2'
          )}
          {toolbarButton(
            editor.isActive('heading', { level: 3 }),
            () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            <span className="text-xs font-bold">H3</span>,
            'Titre 3'
          )}

          <div className="w-px h-5 bg-border mx-1 self-center" />

          {toolbarButton(
            editor.isActive('bulletList'),
            () => editor.chain().focus().toggleBulletList().run(),
            <List className="h-4 w-4" />,
            'Liste à puces'
          )}
          {toolbarButton(
            editor.isActive('orderedList'),
            () => editor.chain().focus().toggleOrderedList().run(),
            <ListOrdered className="h-4 w-4" />,
            'Liste numérotée'
          )}

          <div className="w-px h-5 bg-border mx-1 self-center" />

          {toolbarButton(
            false,
            () =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
            <TableIcon className="h-4 w-4" />,
            'Insérer un tableau'
          )}
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none p-3 focus-within:outline-none',
          '[&_.ProseMirror]:min-h-[400px] [&_.ProseMirror]:outline-none'
        )}
      />
    </div>
  )
}
