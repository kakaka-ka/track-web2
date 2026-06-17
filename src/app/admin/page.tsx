import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">控制台</h1>
        <p className="text-gray-500 mb-8">欢迎使用速运追踪后台管理系统</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashCard
            href="/admin/packages"
            title="包裹管理"
            desc="查看、添加和删除包裹信息"
            icon="📦"
          />
          <DashCard
            href="/admin/import"
            title="导入 CSV/Excel"
            desc="从亚马逊导出文件批量导入包裹"
            icon="📥"
          />
          <DashCard
            href="/admin/carriers"
            title="承运商管理"
            desc="管理可用的物流承运商"
            icon="🚚"
          />
          <DashCard
            href="/admin/delivery-proof"
            title="交货证明"
            desc="生成 Colissimo 官方风格 PDF 交货证明"
            icon="📄"
          />
        </div>
      </main>
    </div>
  );
}

function DashCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </a>
  );
}
