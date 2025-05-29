const Sidebar = ({ onSelect, activeSection }: { onSelect: (section: string) => void; activeSection?: string }) => {
  const sections = [
    { name: "Images", icon: "🖼️" },
    { name: "Files", icon: "📁" },
    { name: "Notes", icon: "📝" },
    { name: "Code", icon: "💻" },
  ];

  return (
    <div className="w-48 md:w-64 bg-gray-900 text-white h-screen p-4 flex flex-col space-y-4 pb-0">
      <h2 className="text-2xl font-bold mt-3 mb-6 flex items-center gap-2">
        <span>🧳</span> My Vault
      </h2>
      <nav className="space-y-2">
        {sections.map((item) => (
          <button
            key={item.name}
            onClick={() => onSelect(item.name)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium transition-all duration-200
  ${
    activeSection === item.name
      ? "bg-gray-800 text-white font-semibold border-l-4 border-blue-500"
      : "text-gray-300 hover:bg-gray-800 hover:text-white"
  }`}

          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;