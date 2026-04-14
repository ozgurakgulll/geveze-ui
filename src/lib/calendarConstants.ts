/**
 * Takvim ve zaman çizelgesi görünümlerinde kullanılan tarih aralığı (2026–2028).
 * Tüm takvim verileri bu aralıkta güncellenir.
 */
export const CALENDAR_MIN_YEAR = 2026;
export const CALENDAR_MAX_YEAR = 2028;
export const CALENDAR_MIN_DATE = new Date(CALENDAR_MIN_YEAR, 0, 1);
export const CALENDAR_MAX_DATE = new Date(CALENDAR_MAX_YEAR, 11, 31);
/** HTML date input max attribute değeri */
export const CALENDAR_MAX_DATE_STRING = '2028-12-31';
