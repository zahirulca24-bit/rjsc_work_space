"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/SharedUI";
import { BriefcaseBusiness } from "lucide-react";
import { NewWorkForm } from "@/components/NewWorkForm";

export default function Page(){
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader
         icon={BriefcaseBusiness}
         title="Start New Work"
         subtitle="Calculate fees, checklist, and rules automatically."
      />
      <NewWorkForm onSuccess={() => router.push("/work-register")} />
    </div>
  )
}
