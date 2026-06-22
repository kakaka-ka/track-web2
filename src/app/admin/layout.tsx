import type { Metadata } from "next";
import AdminSessionProvider from "@/components/AdminSessionProvider";

export const metadata: Metadata = {
  title: "Admin - goooootrack",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
