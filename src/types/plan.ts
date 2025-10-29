export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
}

export type DayItemType = 'transport' | 'attraction' | 'meal' | 'hotel' | 'free';

export interface DayItem {
  id: string;
  type: DayItemType;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: Location;
  notes?: string;
  estimatedCost?: number;
}

export interface DayPlan {
  id: string;
  date: string;
  summary?: string;
  items: DayItem[];
  totalEstimatedCost?: number;
}

export interface TripPlan {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget?: number;
  currency?: string;
  days: DayPlan[];
}

export interface TravelPreferences {
  pace?: 'relaxed' | 'balanced' | 'intensive';
  themes?: string[];
  kidFriendly?: boolean;
  mustHave?: string[];
  avoid?: string[];
}
