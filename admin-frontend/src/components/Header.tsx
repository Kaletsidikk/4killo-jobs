interface HeaderProps {
  title: string;
  onLogout: () => void;
}

const Header = ({ title, onLogout }: HeaderProps) => {
  return (
    <header className="admin-header">
      <h1>{title}</h1>

      <button className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
};

export default Header;