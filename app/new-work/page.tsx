"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/SharedUI";
import { BriefcaseBusiness } from "lucide-react";
import { StepWorkCreation } from "@/components/StepWorkCreation";
import { Suspense } from "react";

function NewWorkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") || undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader
        icon={BriefcaseBusiness}
        title="Start New Work"
        subtitle="Step-based workflow: Client → Documents → Compliance Review → Work Scope → Fees & Save."
      />
      <StepWorkCreation
        initialClientId={initialClientId}
        onSuccess={() => router.push("/work-register")}
        onCancel={() => router.push("/work-register")}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading work creation...</div>}>
      <NewWorkContent />
    </Suspense>
  );
}

