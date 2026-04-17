import React from "react";
import statesData from "../states.json";

interface LocationSelectorProps {
  state: string;
  setState: (val: string) => void;
  district: string;
  setDistrict: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  area: string;
  setArea: (val: string) => void;
  standalone?: boolean;
}

export default function LocationSelector({ 
  state, setState, 
  district, setDistrict, 
  city, setCity, 
  area, setArea,
  standalone = false
}: LocationSelectorProps) {
  const statesList = statesData.states || [];
  const currentDistricts = statesList.find((s: any) => s.state === state)?.districts || [];

  return (
    <div className={`space-y-4 ${standalone ? 'bg-white p-4 rounded-2xl shadow-sm border border-stone-200' : ''}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">State</label>
          <select 
            value={state} 
            onChange={e => { setState(e.target.value); setDistrict(""); }}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700"
          >
            <option value="">Select State</option>
            {statesList.map((s: any) => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">District</label>
          <select 
            value={district} 
            onChange={e => setDistrict(e.target.value)}
            disabled={!state}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700 disabled:opacity-50"
          >
            <option value="">Select District</option>
            {currentDistricts.map((d: string) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">City/Town</label>
          <input 
            type="text" 
            value={city} 
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Pune"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Particular Area Name</label>
          <input 
            type="text" 
            value={area} 
            onChange={e => setArea(e.target.value)}
            placeholder="e.g. Koregaon Park"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700"
          />
        </div>
      </div>
    </div>
  );
}
