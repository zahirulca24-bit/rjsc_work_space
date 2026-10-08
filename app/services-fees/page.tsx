import { PageTitle, Card, Badge } from "@/components/UI";
import { services } from "@/lib/rjsc/services";
import { getLegalReferences, getFeeRule } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";

export default function Page() {
  return (
    <>
      <PageTitle title="Services & Fees" desc="RJSC service master used by dropdowns and automation" />
      <Card>
        <div className="table-wrap overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Service & Category</th>
                <th className="p-3">Entity Types</th>
                <th className="p-3">Fee Rule Status</th>
                <th className="p-3">Requirements</th>
                <th className="p-3">Default Next Action</th>
                <th className="p-3">Source & References</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => {
                const isNeedsReview = s.sourceStatus === 'NEEDS_SOURCE_REVIEW';
                const refs = getLegalReferences(s.id, s.entityTypes[0] || EntityType.PRIVATE_COMPANY);
                const hasFeeRule = s.entityTypes.some(e => getFeeRule(s.id, e) !== null);

                return (
                  <tr className="border-t" key={s.id}>
                    <td className="p-3">
                      <div className="font-semibold">{s.serviceName}</div>
                      <div className="mt-1"><Badge>{s.category}</Badge></div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {s.entityTypes.map(e => (
                          <Badge key={e}>{e.replace('_', ' ')}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      {hasFeeRule ? (
                         <span className="text-emerald-600 font-medium">Configured</span>
                      ) : (
                         <span className="text-amber-600 font-medium">Needs Source Review</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      <div>Docs: {s.requiredDocuments.length}</div>
                      <div>Checklist: {s.checklist.length}</div>
                    </td>
                    <td className="p-3 min-w-[200px]">
                      {s.nextAction || <span className="text-slate-400">Needs Source Review</span>}
                    </td>
                    <td className="p-3 min-w-[250px]">
                      <div className="mb-2">
                        {isNeedsReview ? (
                          <Badge>Needs Source Review</Badge>
                        ) : (
                          <Badge>Verified</Badge>
                        )}
                      </div>
                      {refs.length > 0 ? (
                        <div className="text-xs space-y-1">
                          {refs.map(r => (
                            <div key={r.id} className="text-slate-600">
                              <span className="font-semibold">{r.lawName}</span> - {r.section}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">No references loaded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
