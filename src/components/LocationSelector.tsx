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
  errors?: string[];
}

export default function LocationSelector({ 
  state, setState, 
  district, setDistrict, 
  city, setCity, 
  area, setArea,
  standalone = false,
  errors = []
}: LocationSelectorProps) {
  const statesList = statesData.states || [];
  const currentDistricts = statesList.find((s: any) => s.state === state)?.districts || [];

  return (
    <div className={`space-y-4 ${standalone ? 'bg-white p-4 rounded-2xl shadow-sm border border-stone-200' : ''}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={`block text-xs font-bold uppercase tracking-wider ${errors.includes('state') ? 'text-red-500' : 'text-stone-500'}`}>State</label>
          <select 
            value={state} 
            onChange={e => { setState(e.target.value); setDistrict(""); }}
            className={`w-full bg-stone-50 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700 ${errors.includes('state') ? 'border-red-500' : 'border-stone-200'}`}
          >
            <option value="">Select State</option>
            {statesList.map((s: any) => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className={`block text-xs font-bold uppercase tracking-wider ${errors.includes('district') ? 'text-red-500' : 'text-stone-500'}`}>District</label>
          <select 
            value={district} 
            onChange={e => setDistrict(e.target.value)}
            disabled={!state}
            className={`w-full bg-stone-50 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700 disabled:opacity-50 ${errors.includes('district') ? 'border-red-500' : 'border-stone-200'}`}
          >
            <option value="">Select District</option>
            {currentDistricts.map((d: string) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={`block text-xs font-bold uppercase tracking-wider ${errors.includes('city') ? 'text-red-500' : 'text-stone-500'}`}>City/Town</label>
          <input 
            type="text" 
            value={city} 
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Pune"
            className={`w-full bg-stone-50 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700 ${errors.includes('city') ? 'border-red-500' : 'border-stone-200'}`}
          />
        </div>
        <div className="space-y-2">
          <label className={`block text-xs font-bold uppercase tracking-wider ${errors.includes('area') ? 'text-red-500' : 'text-stone-500'}`}>Particular Area Name</label>
          <input 
            type="text" 
            value={area} 
            onChange={e => setArea(e.target.value)}
            placeholder="e.g. Koregaon Park"
            className={`w-full bg-stone-50 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700 ${errors.includes('area') ? 'border-red-500' : 'border-stone-200'}`}
          />
        </div>
      </div>
    </div>
  );
}
