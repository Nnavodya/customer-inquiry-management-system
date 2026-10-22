
type SidebarProps = {
  activePage: "dashboard" | "inquiries" | "new-inquiry" | "team";
  onNavigate: (page: "dashboard" | "inquiries" | "new-inquiry" | "team") => void;
  onLogout: () => void;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "team", label: "Team Profiles", icon: "👥" },
  { id: "inquiries", label: "All Inquiries", icon: "☷" },
  { id: "new-inquiry", label: "New Inquiry", icon: "+" },
] as const;

export default function Sidebar({
  activePage,
  onNavigate,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="flex w-full flex-col bg-slate-950 text-slate-300 md:min-h-full md:w-64 md:shrink-0">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-2xl">
            ☕
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Coffee Ninja</h2>
            <p className="text-xs text-slate-400">Support workspace</p>
          </div>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-3 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        <div className="flex gap-2 overflow-x-auto md:flex-col">
          {navItems.map((item) => {
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-xl bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">Staff workspace</p>
          <p className="mt-1 text-xs text-slate-400">
            Manage customer inquiries
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
        >
          ↪ Sign Out
        </button>
      </div>
    </aside>
  );
}
