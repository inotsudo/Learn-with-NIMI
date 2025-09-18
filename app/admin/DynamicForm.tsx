'use client'
import React, { useState, useEffect } from 'react'
import supabase from "@/lib/supabaseClient";

interface DynamicFormProps {
  table: string
  row?: any
  onClose: () => void
  onSave: () => void
}

export default function DynamicForm({ table, row = {}, onClose, onSave }: DynamicFormProps) {
  const [formData, setFormData] = useState<any>({})
  const [columns, setColumns] = useState<any[]>([])
  const [loadingColumns, setLoadingColumns] = useState(true)

  useEffect(() => {
    const fetchColumns = async () => {
      setLoadingColumns(true)
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', table.toLowerCase())
        .order('ordinal_position')
      if (!error) setColumns(data ?? [])
      setLoadingColumns(false)
    }
    fetchColumns()
  }, [table])

  useEffect(() => {
    if (columns.length > 0) {
      const initialData: any = {}
      columns.forEach(col => {
        if (!col.column_default?.includes('nextval')) {
          initialData[col.column_name] = row[col.column_name] ?? ''
        }
      })
      setFormData(initialData)
    }
  }, [columns, row])

  const handleChange = (col: string, value: any) => {
    setFormData({ ...formData, [col]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const primaryKey = columns.find(c => c.column_default?.includes('nextval') || c.column_name === 'id')?.column_name || 'id'

      // ✅ Important: cast Supabase table reference to any
      const tableRef = supabase.from(table) as any

      if (row && row[primaryKey]) {
        await tableRef.update(formData).eq(primaryKey, row[primaryKey])
      } else {
        await tableRef.insert([formData])
      }

      onSave()
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  if (loadingColumns) return <div>Loading form...</div>

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded mb-4 bg-gray-50">
      {columns.map(col => {
        if (col.column_default?.includes('nextval') && !row[col.column_name]) return null
        const value = formData[col.column_name] ?? ''
        switch (col.data_type) {
          case 'boolean':
            return (
              <div key={col.column_name} className="mb-2">
                <label>
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={e => handleChange(col.column_name, e.target.checked)}
                  /> {col.column_name}
                </label>
              </div>
            )
          case 'date':
          case 'timestamp without time zone':
            return (
              <div key={col.column_name} className="mb-2">
                <label>{col.column_name}</label>
                <input
                  type="date"
                  value={value ? value.split('T')[0] : ''}
                  onChange={e => handleChange(col.column_name, e.target.value)}
                  className="border px-2 py-1 w-full rounded"
                />
              </div>
            )
          case 'json':
          case 'jsonb':
            return (
              <div key={col.column_name} className="mb-2">
                <label>{col.column_name}</label>
                <textarea
                  value={JSON.stringify(value, null, 2)}
                  onChange={e => {
                    try { handleChange(col.column_name, JSON.parse(e.target.value)) } catch {}
                  }}
                  className="border px-2 py-1 w-full rounded"
                  rows={3}
                />
              </div>
            )
          default:
            return (
              <div key={col.column_name} className="mb-2">
                <label>{col.column_name}</label>
                <input
                  type="text"
                  value={value}
                  onChange={e => handleChange(col.column_name, e.target.value)}
                  className="border px-2 py-1 w-full rounded"
                />
              </div>
            )
        }
      })}
      <div className="flex gap-2 mt-2">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
        <button type="button" onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancel</button>
      </div>
    </form>
  )
}
