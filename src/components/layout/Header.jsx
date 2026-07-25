import { useNavigate } from "react-router-dom";
import { IconChevronLeft, IconDotsVertical } from "@tabler/icons-react";

export default function Header({ title, showBack = false, right = null }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-[#E5E5EA]">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 rounded-lg hover:bg-surface-2 transition"
          aria-label="Volver"
        >
          <IconChevronLeft size={22} stroke={1.5} className="text-primary" />
        </button>
      )}
      <h1 className="text-lg font-medium flex-1 text-primary">{title}</h1>
      {right ? (
        <div>{right}</div>
      ) : (
        <button className="p-1 rounded-lg hover:bg-surface-2 transition">
          <IconDotsVertical size={20} stroke={1.5} className="text-gray-400" />
        </button>
      )}
    </header>
  );
}

