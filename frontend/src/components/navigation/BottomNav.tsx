import { Home, Sparkles, Bookmark, Settings as SettingsIcon } from "lucide-react";
import { useAppLanguage } from "../../services/language";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useAppLanguage();

  const navItems = [
    {
      id: "Home",
      label: t.homeTab,
      icon: <Home size={20} />,
    },
    {
      id: "For You",
      label: t.forYouTab,
      icon: <Sparkles size={20} />,
    },
    {
      id: "Saved",
      label: t.savedTab,
      icon: <Bookmark size={20} />,
    },
    {
      id: "Settings",
      label: t.settingsTab,
      icon: <SettingsIcon size={20} />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur shadow-lg">
      <div className="mx-auto flex max-w-md justify-around px-2">
        {navItems.map((item) => {
          const active = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-1 flex-col items-center justify-center py-2.5 transition active:scale-95 ${
                active
                  ? "font-bold text-blue-600"
                  : "font-medium text-slate-400 hover:text-slate-600"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                  active ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                {item.icon}
              </div>

              <span className="mt-0.5 text-[11px] leading-tight tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;