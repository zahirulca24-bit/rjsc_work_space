"use client";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, ReceiptText, CircleDollarSign, AlertTriangle, CheckCircle2, BriefcaseBusiness, Users, Calculator, ClipboardList } from "lucide-react";
const members = [
  {
    name: "Md. Zahirul Islam",
    role: "Manager",
    initials: "ZI",
    assigned: 6,
    open: 4,
    review: 3,
    completed: 18,
    status: "Active",
  },
  {
    name: "Hemadry Roy",
    role: "Senior Auditor",
    initials: "HR",
    assigned: 5,
    open: 3,
    review: 1,
    completed: 12,
    status: "Active",
  },
  {
    name: "Md. Bayezid",
    role: "Audit Associate",
    initials: "MB",
    assigned: 4,
    open: 3,
    review: 0,
    completed: 8,
    status: "Active",
  },
  {
    name: "Noyon",
    role: "RJSC Executive",
    initials: "N",
    assigned: 5,
    open: 2,
    review: 1,
    completed: 14,
    status: "Active",
  },
];

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={Users}
        title="Team Directory"
        subtitle="Manage firm members and basic roles."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Members" value="4" icon={Users} color="aqua" />
        <StatCard title="Managers" value="1" icon={BriefcaseBusiness} color="coral" />
        <StatCard title="Seniors" value="1" icon={CheckCircle2} color="sage" />
        <StatCard title="Juniors" value="2" icon={FolderOpen} color="yellow" />
      </div>

      <ContentCard>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="font-black text-[#181818]">Noyon</Td>
              <Td><StatusBadge status="Manager" /></Td>
              <Td className="text-[#447a5d] font-bold">Active</Td>
            </tr>
            <tr>
              <Td className="font-black text-[#181818]">Rakib</Td>
              <Td><StatusBadge status="Senior" /></Td>
              <Td className="text-[#447a5d] font-bold">Active</Td>
            </tr>
            <tr>
              <Td className="font-black text-[#181818]">John</Td>
              <Td><StatusBadge status="Junior" /></Td>
              <Td className="text-[#447a5d] font-bold">Active</Td>
            </tr>
          </tbody>
        </Table>
      </ContentCard>
    </div>
  );
}
