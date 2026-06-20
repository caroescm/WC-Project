// Parses "dd/mm/yyyy HH:MM" as UTC and returns a Date object
export function parseMatchDateUTC(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  const [dd, mm, yyyy] = datePart.split("/");
  const [hh, min] = timePart.split(":");
  return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min));
}