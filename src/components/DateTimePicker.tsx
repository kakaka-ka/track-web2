"use client";

interface Props {
  value: string; // "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  required?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function DateTimePicker({ value, onChange, required }: Props) {
  const [datePart = "", timePart = "00:00"] = value.split("T");
  const [hourStr = "00", minuteStr = "00"] = timePart.split(":");

  return (
    <div className="flex gap-1 items-center">
      <input
        type="date"
        required={required}
        value={datePart}
        onChange={(e) => onChange(e.target.value + "T" + (timePart || "00:00"))}
        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={hourStr}
        onChange={(e) => onChange((datePart || "") + "T" + e.target.value + ":" + minuteStr)}
        className="w-14 border border-gray-300 rounded-lg px-1 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-gray-400 text-sm font-medium">:</span>
      <select
        value={minuteStr}
        onChange={(e) => onChange((datePart || "") + "T" + hourStr + ":" + e.target.value)}
        className="w-14 border border-gray-300 rounded-lg px-1 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
