import { useState } from 'react';
import { Globe, MapPin, Layers } from 'lucide-react';
import Countries from './Countries';
import States from './States';
import Zones from './Zones';

type Tab = 'countries' | 'states' | 'zones';

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'states', label: 'States', icon: MapPin },
  { id: 'zones', label: 'Zones', icon: Layers },
];

export default function LocationManagement({ readOnly: _readOnly = false }: { readOnly?: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('countries');

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] gradient-blob-teal opacity-25" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />

      <div className="animate-slide-up relative z-10">
        <h1 className="text-3xl font-bold mb-2">Location Management</h1>
        <p className="text-[#9CA3AF]">Manage countries, states and zones hierarchy</p>
      </div>

      {/* Hierarchy breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-[#9CA3AF] relative z-10">
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)' }}>
          <Globe className="w-3.5 h-3.5 text-[#6EE7B7]" />
          <span className="text-[#6EE7B7] font-medium">Country</span>
        </div>
        <span className="text-gray-700">→</span>
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)' }}>
          <MapPin className="w-3.5 h-3.5 text-[#6EE7B7]" />
          <span className="text-[#6EE7B7] font-medium">State</span>
        </div>
        <span className="text-gray-700">→</span>
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)' }}>
          <Layers className="w-3.5 h-3.5 text-[#6EE7B7]" />
          <span className="text-[#6EE7B7] font-medium">Zone</span>
        </div>
        <span className="text-gray-700">→</span>
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#0F1412] border border-gray-800">
          <span className="text-[#9CA3AF]">House</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex space-x-1 bg-[#0F1412] rounded-xl p-1 relative z-10 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-[#14532D] text-[#6EE7B7]'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1a2420]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-card rounded-2xl p-6 border border-gray-800/50 relative z-10 backdrop-blur-xl">
        {activeTab === 'countries' && <Countries />}
        {activeTab === 'states' && <States />}
        {activeTab === 'zones' && <Zones />}
      </div>
    </div>
  );
}
