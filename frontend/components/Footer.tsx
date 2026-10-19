
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
      <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="text-sm font-semibold text-slate-700">
          ☕ Coffee Ninja
          <span className="ml-2 font-normal text-slate-500">
            Customer Inquiry Management System
          </span>
        </p>

        <p className="text-xs text-slate-500">
          Built for better customer support.
        </p>
      </div>
    </footer>
  );
}
