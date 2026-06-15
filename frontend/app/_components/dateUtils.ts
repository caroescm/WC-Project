// Parses "dd/mm/yyyy HH:MM" as UTC and returns a Date object
export function parseMatchDateUTC(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  const [dd, mm, yyyy] = datePart.split("/");
  const [hh, min] = timePart.split(":");
  return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min));
}

// Returns local time string in user's timezone, e.g. "2:00 PM"
export function localTime(dateStr: string): string {
  return parseMatchDateUTC(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Returns local date string, e.g. "Monday, June 15"
export function localDateHeader(dateStr: string): string {
  return parseMatchDateUTC(dateStr).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
