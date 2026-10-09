import { services } from "@/lib/rjsc/services";
import { getLegalReferences, getFeeRule } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { PageHeader, ContentCard, StatCard, StatusBadge, Table, Th, Td } from "@/components/SharedUI";
import { ReceiptText, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";

export default function Page() {
  const needsReview = services.filter(s => s.sourceStatus === 'NEEDS_SOURCE_REVIEW').length;
  const verified = services.length - needsReview;
  const configured = services.filter(s => s.entityTypes.some(e => getFeeRule(s.id, e) !== null)).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={ReceiptText}
        title="Services & Fees"
        subtitle="RJSC service master used by dropdowns and automation."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Services" value={services.length} icon={ReceiptText} color="aqua" />
        <StatCard title="Configured" value={configured} icon={Building2} color="yellow" />
        <StatCard title="Needs Review" value={needsReview} icon={AlertTriangle} color="coral" />
        <StatCard title="Verified Sources" value={verified} icon={CheckCircle2} color="sage" />
      </div>

      <ContentCard>
        <Table>
          <thead>
            <tr>
              <Th>Service & Category</Th>
              <Th>Entity Types</Th>
              <Th>Fee Rule Status</Th>
              <Th>Requirements</Th>
              <Th>Default Next Action</Th>
              <Th>Source & References</Th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => {
              const isNeedsReview = s.sourceStatus === 'NEEDS_SOURCE_REVIEW';
              const refs = getLegalReferences(s.id, s.entityTypes[0] || EntityType.PRIVATE_COMPANY);
              const hasFeeRule = s.entityTypes.some(e => getFeeRule(s.id, e) !== null);

              return (
                <tr key={s.id}>
                  <Td>
                    <div className="font-black text-[#181818]">{s.serviceName}</div>
                    <div className="mt-2"><StatusBadge status={s.category} /></div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {s.entityTypes.map(e => (
                        <span key={e} className="inline-flex items-center rounded-lg bg-[#e8f7f9] px-2 py-1 text-[10px] font-bold text-[#2c747d] uppercase tracking-widest">
                          {e.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    {hasFeeRule ? (
                       <span className="font-black text-[#447a5d] text-sm">Configured</span>
                    ) : (
                       <span className="font-bold text-[#a03c2a] text-sm">Needs Source Review</span>
                    )}
                  </Td>
                  <Td className="text-sm font-bold text-[#6c7671]">
                    <div>Docs: {s.requiredDocuments.length}</div>
                    <div>Checklist: {s.checklist.length}</div>
                  </Td>
                  <Td className="text-sm font-medium">
                    {s.nextAction ? <span className="font-bold text-[#181818]">{s.nextAction}</span> : <span className="text-[#a03c2a] font-bold">Needs Source Review</span>}
                  </Td>
                  <Td className="min-w-[250px]">
                    <div className="mb-2">
                      <StatusBadge status={isNeedsReview ? "Needs Review" : "Verified"} />
                    </div>
                    {refs.length > 0 ? (
                      <div className="text-xs space-y-1 mt-2">
                        {refs.map(r => (
                          <div key={r.id} className="text-[#4b4d47] font-medium leading-relaxed">
                            <span className="font-black text-[#181818]">{r.lawName}</span> - {r.section}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#6c7671] text-xs font-bold italic">No references loaded</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </ContentCard>
    </div>
  );
}
