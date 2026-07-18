"use client";

import React from "react";

export type ResponsiveTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  /** Shown as label in mobile card rows; defaults to header text */
  mobileLabel?: React.ReactNode;
  /** Hide this field from the default mobile card layout */
  hideOnMobile?: boolean;
  headerClassName?: string;
  cellClassName?: string;
};

type ResponsiveTableProps<T> = {
  columns: ResponsiveTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: React.ReactNode;
  /** Custom mobile card; receives row and column helpers */
  renderMobileCard?: (row: T) => React.ReactNode;
  tableClassName?: string;
};

export default function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No results.",
  renderMobileCard,
  tableClassName = "",
}: ResponsiveTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table — scroll contained to this wrapper, not the page */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full min-w-[640px] text-left text-sm whitespace-nowrap ${tableClassName}`}>
          <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.headerClassName ?? ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.cellClassName ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card stack */}
      <div className="md:hidden divide-y divide-slate-100">
        {rows.map((row) =>
          renderMobileCard ? (
            <div key={rowKey(row)} className="p-4">
              {renderMobileCard(row)}
            </div>
          ) : (
            <div key={rowKey(row)} className="p-4 space-y-3">
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {col.mobileLabel ?? col.header}
                    </span>
                    <div className="min-w-0 text-sm">{col.render(row)}</div>
                  </div>
                ))}
            </div>
          ),
        )}
      </div>
    </>
  );
}
