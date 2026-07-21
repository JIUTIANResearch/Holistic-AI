import React from "react";
import { Shield, Settings, FileText, BarChart2, MessageSquare, Menu } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const tabs = [
    { id: "scenario", label: "情景构建", icon: Settings },
    { id: "simulation", label: "模拟交互", icon: MessageSquare },
    { id: "path", label: "路径分析", icon: BarChart2 },
    { id: "evaluation", label: "防御评估", icon: Shield },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button 
        className="lg:hidden absolute top-4 left-4 z-50 text-[#A1A1AA] hover:text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu size={24} />
      </button>

      <div className={twMerge(
        "fixed inset-y-0 left-0 z-40 w-64 bg-[#0F0F12] border-r border-[#27272A] flex flex-col transition-transform duration-300 ease-in-out transform",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "lg:static lg:inset-0"
      )}>
        <div className="flex items-center space-x-2 px-6 py-5 border-b border-[#27272A] mb-4 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-[#38BDF8] to-[#818CF8] rounded flex items-center justify-center font-bold text-black text-[10px] shrink-0">PSA</div>
          <h1 className="text-sm tracking-wide text-white leading-tight font-bold">
            个性化安全对齐平台
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={clsx(
                  "flex items-center space-x-3 w-full px-3 py-2.5 rounded text-xs font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-[#18181B] text-[#38BDF8]" 
                    : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#E4E4E7]"
                )}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-6 mt-auto">
          <div className="p-4 rounded-lg bg-gradient-to-tr from-[#1E1B4B] to-[#0F172A] border border-[#312E81]">
             <div className="text-[11px] text-[#818CF8] font-bold uppercase mb-1">平台状态</div>
             <div className="flex items-center space-x-2 mt-1">
               <span className="text-sm text-white">PSA 引擎运行中</span>
             </div>
             <div className="h-1 w-full bg-white/10 mt-3 rounded-full overflow-hidden">
               <div className="h-full bg-[#818CF8] w-2/3"></div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
