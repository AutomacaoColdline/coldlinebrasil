/**
 * Wrapper para tabelas com scroll horizontal em telas pequenas.
 * Use:
 *   <ResponsiveTable>
 *     <table className="w-full">...</table>
 *   </ResponsiveTable>
 */
export default function ResponsiveTable({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  )
}
