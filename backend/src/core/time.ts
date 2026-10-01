// Fecha calendario actual en Chile; "en-CA" formatea como YYYY-MM-DD
export const todayInSantiago = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

export const toDateOnly = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
export const fromDateOnly = (date: Date): string => date.toISOString().slice(0, 10);
