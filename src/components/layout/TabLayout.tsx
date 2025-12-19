import React, { useState } from "react";
import {
  NavLink,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users,
  FolderKanban,
  FileCheck,
  ClipboardList,
  Bell,
  LayoutGrid,
  LogOut,
  Menu,
  X,
} from "lucide-react";

// Tab 页面组件
import ClientsTab from "@/pages/tabs/ClientsTab";
import ProjectsTab from "@/pages/tabs/ProjectsTab";
import DealsTab from "@/pages/tabs/DealsTab";
import DailyFormTab from "@/pages/tabs/DailyFormTab";
import RemindersTab from "@/pages/tabs/RemindersTab";
import KanbanTab from "@/pages/tabs/KanbanTab";

type TabKey =
  | "kanban"
  | "clients"
  | "projects"
  | "deals"
  | "daily"
  | "reminders";

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const tabs: TabItem[] = [
  { key: "kanban", label: "看板视图", icon: LayoutGrid },
  { key: "clients", label: "客户", icon: Users },
  { key: "projects", label: "项目", icon: FolderKanban },
  { key: "deals", label: "立项", icon: FileCheck },
  { key: "daily", label: "每日表单", icon: ClipboardList },
  { key: "reminders", label: "提醒预览", icon: Bell },
];

const TabLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - 飞书小程序风格 */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                BD
              </span>
            </div>
            <span className="font-semibold text-foreground">BD 日常小程序</span>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user?.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex"
            >
              <LogOut className="mr-1 h-4 w-4" />
              退出
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-card p-4 sm:hidden">
            <div className="mb-2 text-sm text-muted-foreground">
              {user?.name}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start"
            >
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </Button>
          </div>
        )}

        {/* Tab Navigation - 顶部 Tab 栏（基于路由高亮） */}
        <nav className="flex overflow-x-auto border-t border-border bg-background">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.key}
                to={tab.key} // 相对路径：/app/clients, /app/projects ...
                className={({ isActive }) =>
                  cn(
                    "flex flex-1 min-w-[80px] flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors border-b-2",
                    isActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>

      {/* Main Content：根据 /app/* 子路径渲染不同 Tab */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Routes>
            {/* 默认访问 /app 时，跳到 /app/clients */}
            <Route path="/" element={<Navigate to="clients" replace />} />

            <Route path="kanban" element={<KanbanTab />} />
            <Route path="clients" element={<ClientsTab />} />
            <Route path="projects" element={<ProjectsTab />} />
            <Route path="deals" element={<DealsTab />} />
            <Route path="daily" element={<DailyFormTab />} />
            <Route path="reminders" element={<RemindersTab />} />

            {/* 兜底：任何未知子路径都跳回客户 Tab */}
            <Route path="*" element={<Navigate to="clients" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default TabLayout;
