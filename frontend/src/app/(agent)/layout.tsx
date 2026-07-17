import { DashboardLayout } from "@/components/DashboardLayout";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allow={["AGENT"]}>{children}</DashboardLayout>;
}
