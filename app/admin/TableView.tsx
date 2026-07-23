'use client';

import { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { SkeletonTable } from './Skeleton'
import { useToast } from './Toast'

interface TableViewProps {
  /** Table name, or "table:rowId" to scroll to and highlight a specific row */
  table: string;
}

function formatHeader(key: string) {
  return key.replace(/_/g, ' ')
}

function formatCell(val: unknown) {
  if (val === null || val === undefined) {
    return <span className="text-gray-300">—</span>
  }
  if (typeof val === "boolean") {
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
        val ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {val ? 'true' : 'false'}
      </span>
    )
  }
  if (typeof val === "object") {
    return <span className="font-mono text-xs text-gray-500">{JSON.stringify(val)}</span>
  }
  return String(val)
}

export default function TableView({ table }: TableViewProps) {
  const { error: toastErr } = useToast()
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const [tableName, highlightId] = table.split(':');

  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      try {
        const lowerName = tableName.toLowerCase(); // enforce lowercase table name
        // Map legacy table names to current schema
        const resolvedTable = lowerName === "profiles" || lowerName === "users" ? "parents" : lowerName;

        const { data, error } = await supabase
          .from(resolvedTable)
          .select("*");

        if (error) throw error;
        setRows(data || []);
      } catch (err: any) {
        toastErr(`Failed to load table "${tableName}".`);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [tableName]);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [rows, highlightId]);

  const title = tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          {!loading && rows.length > 0 && (
            <span className="text-sm font-semibold text-gray-400">
              {rows.length} row{rows.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={8} cols={5} />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-gray-400 text-sm">No data found in {title}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {Object.keys(rows[0]).map((key) => (
                    <th key={key} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase text-xs tracking-wide whitespace-nowrap">
                      {formatHeader(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => {
                  const isHighlighted = highlightId !== undefined && String(row.id) === highlightId
                  return (
                  <tr
                    key={i}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={`transition ${isHighlighted ? 'bg-indigo-50 hover:bg-indigo-50' : 'hover:bg-gray-50/70'}`}
                  >
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {formatCell(val)}
                      </td>
                    ))}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
