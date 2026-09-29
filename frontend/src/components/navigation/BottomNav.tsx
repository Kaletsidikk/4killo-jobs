import type { ReactNode } from "react";

interface NavItem {
  label: string;
  icon: ReactNode;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems: NavItem[] = [
  {
    label: "Home",
    icon: "⌂",
  },
  {
    label: "For You",
    icon: "★",
  },
  {
    label: "Saved",
    icon: "♡",
  },
  {
    label: "Settings",
    icon: "⚙",
  },
];

function BottomNav({
  activeTab,
  onTabChange,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="max-w-md mx-auto flex justify-around">
        {navItems.map((item) => {
          const active = activeTab === item.label;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onTabChange(item.label)}
              className={`flex flex-col items-center justify-center py-3 px-4 text-sm transition ${
                active
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-blue-500"
              }`}
            >
              <span className="text-xl">
                {item.icon}
              </span>

              <span className="mt-1">
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