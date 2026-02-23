import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0F1412] border-t border-gray-800/50 py-6 px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="text-[#9CA3AF] text-sm transition-all duration-300 hover:text-[#6EE7B7] hover:drop-shadow-[0_0_8px_rgba(110,231,183,0.5)]">
            © WeVysya 2026. Global House Management Software.
          </p>
        </div>

        <div className="flex items-center gap-2 group cursor-default">
          <span className="text-[#9CA3AF] text-sm transition-all duration-300 group-hover:text-[#6EE7B7] group-hover:drop-shadow-[0_0_8px_rgba(110,231,183,0.5)]">
            Stop thinking "I". Start thinking "WE".
          </span>
          <Heart
            className="w-4 h-4 text-[#6EE7B7] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(110,231,183,0.6)] group-hover:fill-[#6EE7B7]"
          />
        </div>
      </div>
    </footer>
  );
}
