interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const Sidebar = ({ activePage, onNavigate }: SidebarProps) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "jobs", label: "Jobs" },
    { id: "users", label: "Users" },
    { id: "sources", label: "Sources" },
    //{ id: "scraping", label: "Scraping" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>4Killo</h2>
        <span>Admin</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${
              activePage === item.id ? "active" : ""
            }`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;