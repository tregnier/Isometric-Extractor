import type { BomItem, Placement } from "@/lib/types";

type BomTableProps = {
  bom: BomItem[];
  placements: Placement[];
};

export function BomTable({ bom, placements }: BomTableProps) {
  if (!bom.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
        No BOM rows detected yet. Upload a drawing with a visible ITEM / QTY / DESCRIPTION table.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Qty</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Located</th>
          </tr>
        </thead>
        <tbody>
          {bom.map((row) => {
            const located = placements.some((placement) => placement.itemNo === row.itemNo);
            return (
              <tr key={row.itemNo} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.itemNo}</td>
                <td className="px-4 py-3 text-slate-700">{row.qty}</td>
                <td className="px-4 py-3 text-slate-700">{row.description}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      located
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {located ? "Yes" : "Missing"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
