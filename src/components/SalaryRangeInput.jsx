import React, { useState, useEffect } from 'react';
import { SALARY_RANGES } from '../constants';

function SalaryRangeInput({ 
  value, 
  onChange, 
  placeholder = "Select or type salary range...",
  disabled = false,
  className = ""
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  
  // Sync internal state with external value prop
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);
  
  const handleInputChange = (e) => {
    if (disabled) return;
    
    let newValue = e.target.value;
    
    // Remove non-digit characters except comma
    const cleanValue = newValue.replace(/[^\d,]/g, '');
    // Remove all commas first, then re-add them for proper formatting
    const digitsOnly = cleanValue.replace(/,/g, '');
    // Apply comma formatting for mathematical decimal usage
    newValue = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelect = (range) => {
    if (disabled) return;
    
    setInputValue(range);
    onChange(range);
    setShowDropdown(false);
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleFocus = () => {
    if (!disabled) {
      setShowDropdown(true);
    }
  };

  const baseInputClass = "w-full pl-8 pr-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition";
  const disabledClass = disabled ? "bg-slate-50 cursor-not-allowed border-slate-200" : "border-slate-200";
  const finalInputClass = `${baseInputClass} ${disabledClass} ${className}`;

  return (
    <div className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold z-10">
          ₱
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={finalInputClass}
        />
      </div>
      
      {showDropdown && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {SALARY_RANGES.map((range, index) => (
            <div
              key={index}
              onClick={() => handleSelect(range)}
              className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm text-slate-700 hover:text-emerald-700 transition-colors border-b border-slate-50 last:border-b-0"
            >
              {range}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SalaryRangeInput;
