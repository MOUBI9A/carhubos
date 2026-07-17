import { DashboardLayout } from "@/components/DashboardLayout";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allow={["OWNER", "MANAGER"]}>{children}</DashboardLayout>;
}
