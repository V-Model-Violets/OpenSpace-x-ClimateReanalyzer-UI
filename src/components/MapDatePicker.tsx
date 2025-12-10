import React, { useState, useRef, useEffect } from "react";
import "./ModernDatePicker.css";

interface ModernDatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  label?: string;
}

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Select a date",
  minDate,
  maxDate,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const displayValue = value ? formatDisplayDate(new Date(value)) : "";

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    setIsOpen(false);
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();

      if (typeof inputRef.current.showPicker === "function") {
        inputRef.current.showPicker();
      } else {
        inputRef.current.click();
      }
    }
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="modern-date-picker-container" ref={pickerRef}>
      {label && <label className="modern-date-picker-label">{label}</label>}
      <div className={`modern-date-picker ${isOpen ? "open" : ""}`}>
        <div className="date-display" onClick={handleInputClick}>
          <div className="date-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
            </svg>
          </div>
          <span className={`date-text ${!displayValue ? "placeholder" : ""}`}>
            {displayValue || placeholder}
          </span>
          {displayValue && (
            <button
              className="clear-button"
              onClick={handleClear}
              type="button"
              aria-label="Clear date"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={handleDateChange}
          min={minDate}
          max={maxDate}
          className="hidden-date-input"
        />
      </div>
    </div>
  );
};
