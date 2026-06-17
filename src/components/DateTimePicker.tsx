"use client";

interface Props {
  value: string; // "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  required?: boolean;
}

export default function DateTimePicker({ value, onChange, required }: Props) {
  const [datePart = "", timePart = ""] = value.split("T");
  return (
    <div className="flex gap-1">
      <input
        type="date"
        required={required}
        value={datePart}
        onChange={(e) => onChange(e.target.value + "T" + (timePart || "00:00"))}
        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="time"
        required={required}
        value={timePart}
        onChange={(e) => onChange((datePart || "") + "T" + e.target.value)}
        className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
