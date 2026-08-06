export interface CvrCompanyData {
  cvr: string;
  name: string;
  address?: string;
  city?: string;
  zipcode?: string;
  location?: string;
  phone?: string;
  email?: string;
  industry?: string;
  industryCode?: string;
  employeeCount?: string;
  description?: string;
  startDate?: string;
  companyType?: string;
}

interface CvrApiResponse {
  vat?: number;
  name?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  phone?: string;
  email?: string;
  industrydesc?: string;
  industrycode?: number;
  employees?: number | string;
  companydesc?: string;
  startdate?: string;
  companytype?: string;
  error?: string;
  message?: string;
}

const CVR_API_URL = 'https://cvrapi.dk/api';
const USER_AGENT = 'ApplyPilot - career-intelligence-app';

export function isCvrNumber(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/\s/g, ''));
}

export async function fetchCvrData(search: string): Promise<CvrCompanyData | null> {
  const query = search.trim();
  if (!query) return null;

  const searchParam = isCvrNumber(query) ? query.replace(/\s/g, '') : query;

  const response = await fetch(
    `${CVR_API_URL}?search=${encodeURIComponent(searchParam)}&country=dk`,
    {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`CVR API fejl (${response.status})`);
  }

  const data = (await response.json()) as CvrApiResponse;
  if (data.error || !data.vat || !data.name) {
    return null;
  }

  const locationParts = [data.address, data.zipcode, data.city].filter(Boolean);

  return {
    cvr: String(data.vat),
    name: data.name,
    address: data.address,
    city: data.city,
    zipcode: data.zipcode,
    phone: data.phone,
    email: data.email,
    industry: data.industrydesc,
    industryCode: data.industrycode ? String(data.industrycode) : undefined,
    employeeCount: data.employees != null ? String(data.employees) : undefined,
    description: data.companydesc,
    startDate: data.startdate,
    companyType: data.companytype,
    location: locationParts.join(', ') || undefined,
  };
}
