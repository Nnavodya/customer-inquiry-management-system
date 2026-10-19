
type HeaderProps = {
  username: string;
  onLogout: () => void;
};

export default function Header({ username, onLogout }: HeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">
          Coffee Ninja
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Customer Inquiry Management
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 font-bold text-cyan-800">
          {username.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">Signed in as</p>
          <p className="font-semibold text-slate-800">{username}</p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
