import type { CountryCode } from "libphonenumber-js";

export type CountryEntry = {
  code: CountryCode;
  dial: string;
  name: string;
  placeholder: string;
  maxLen: number;
};

export const COUNTRIES: CountryEntry[] = [
  { code: "AE", dial: "+971", name: "United Arab Emirates", placeholder: "501234567", maxLen: 9 },
  { code: "IN", dial: "+91",  name: "India",                placeholder: "9876543210", maxLen: 10 },
  { code: "PK", dial: "+92",  name: "Pakistan",             placeholder: "3001234567", maxLen: 10 },
  { code: "SA", dial: "+966", name: "Saudi Arabia",         placeholder: "501234567",  maxLen: 9 },
  { code: "KW", dial: "+965", name: "Kuwait",               placeholder: "51234567",   maxLen: 8 },
  { code: "BH", dial: "+973", name: "Bahrain",              placeholder: "36123456",   maxLen: 8 },
  { code: "OM", dial: "+968", name: "Oman",                 placeholder: "91234567",   maxLen: 8 },
  { code: "QA", dial: "+974", name: "Qatar",                placeholder: "33123456",   maxLen: 8 },
  { code: "GB", dial: "+44",  name: "United Kingdom",       placeholder: "7400123456", maxLen: 10 },
  { code: "US", dial: "+1",   name: "United States",        placeholder: "4155551234", maxLen: 10 },
];

export const DEFAULT_COUNTRY: CountryEntry = COUNTRIES[0]!;

export function findCountry(code: CountryCode): CountryEntry {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}
