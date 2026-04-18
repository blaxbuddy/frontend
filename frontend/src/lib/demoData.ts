/**
 * Demo data for Indore, Madhya Pradesh, India.
 * Restaurants with surplus food, NGO shelters, volunteer drivers, and pending pickups.
 */

import type { Business, Driver, Pickup, Shelter } from "@/hooks/useLiveData";

const id = (n: number) => `demo-${String(n).padStart(4, "0")}`;

/** Map center — Indore city center (near Rajwada Palace) */
export const MAP_CENTER: [number, number] = [22.7196, 75.8577];

export const DEMO_BUSINESSES: Business[] = [
  {
    id: id(1),
    name: "Sarafa Bazaar Night Market",
    address: "Sarafa Bazaar, Indore",
    lat: 22.7185,
    lng: 75.8569,
    closes_at: "01:00:00",
    type: "restaurant",
  },
  {
    id: id(2),
    name: "Chappan Dukan",
    address: "56 Dukan, New Palasia, Indore",
    lat: 22.7234,
    lng: 75.8826,
    closes_at: "22:00:00",
    type: "restaurant",
  },
  {
    id: id(3),
    name: "Johny Hot Dog",
    address: "Sarafa, Indore",
    lat: 22.7179,
    lng: 75.8556,
    closes_at: "23:30:00",
    type: "restaurant",
  },
  {
    id: id(4),
    name: "Nafees Restaurant",
    address: "MG Road, Indore",
    lat: 22.7175,
    lng: 75.8623,
    closes_at: "23:00:00",
    type: "restaurant",
  },
  {
    id: id(5),
    name: "Shree Gurukripa Restaurant",
    address: "South Tukoganj, Indore",
    lat: 22.7205,
    lng: 75.8786,
    closes_at: "22:30:00",
    type: "restaurant",
  },
  {
    id: id(6),
    name: "Rajwada Poha Corner",
    address: "Near Rajwada Palace, Indore",
    lat: 22.7196,
    lng: 75.8577,
    closes_at: "14:00:00",
    type: "restaurant",
  },
];

export const DEMO_SHELTERS: Shelter[] = [
  {
    id: id(101),
    name: "Muskan Foundation",
    address: "MR-10 Road, Indore",
    lat: 22.7440,
    lng: 75.8860,
    capacity: 200,
    accepts_until: "22:00:00",
    type: "ngo",
  },
  {
    id: id(102),
    name: "Robin Hood Army Indore",
    address: "Vijay Nagar, Indore",
    lat: 22.7520,
    lng: 75.8930,
    capacity: 100,
    accepts_until: "21:30:00",
    type: "ngo",
  },
  {
    id: id(103),
    name: "Annapurna Rasoi Indore",
    address: "Near Sirpur Lake, Indore",
    lat: 22.6864,
    lng: 75.8534,
    capacity: 300,
    accepts_until: "20:00:00",
    type: "ngo",
  },
  {
    id: id(104),
    name: "Feeding India — Indore Hub",
    address: "Sapna Sangeeta Road, Indore",
    lat: 22.7280,
    lng: 75.8820,
    capacity: 150,
    accepts_until: "21:00:00",
    type: "ngo",
  },
];

export const DEMO_DRIVERS: Driver[] = [
  {
    id: id(201),
    name: "Arjun Patel",
    vehicle: "van",
    capacity: 50,
    lat: 22.7196,
    lng: 75.8577,
    status: "available",
    updated_at: new Date().toISOString(),
  },
  {
    id: id(202),
    name: "Priya Singh",
    vehicle: "car",
    capacity: 20,
    lat: 22.7230,
    lng: 75.8780,
    status: "available",
    updated_at: new Date().toISOString(),
  },
  {
    id: id(203),
    name: "Rahul Sharma",
    vehicle: "bike",
    capacity: 5,
    lat: 22.7185,
    lng: 75.8600,
    status: "available",
    updated_at: new Date().toISOString(),
  },
  {
    id: id(204),
    name: "Deepa Verma",
    vehicle: "truck",
    capacity: 100,
    lat: 22.6900,
    lng: 75.8540,
    status: "available",
    updated_at: new Date().toISOString(),
  },
];

function h(hours: number) {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export const DEMO_PICKUPS: Pickup[] = [
  {
    id: id(301),
    business_id: id(1), // Sarafa Bazaar
    shelter_id: id(103), // Annapurna Rasoi (near Sirpur Lake)
    driver_id: null,
    food_description: "50 jalebi + 30 garadu portions",
    quantity: 50,
    expires_at: h(1.5),
    status: "pending",
  },
  {
    id: id(302),
    business_id: id(2), // Chappan Dukan
    shelter_id: id(102), // Robin Hood Army
    driver_id: null,
    food_description: "40 samosa + chutney packs",
    quantity: 40,
    expires_at: h(1),
    status: "pending",
  },
  {
    id: id(303),
    business_id: id(3), // Johny Hot Dog
    shelter_id: id(101), // Muskan Foundation
    driver_id: null,
    food_description: "25 hot dog + burger combos",
    quantity: 25,
    expires_at: h(2),
    status: "pending",
  },
  {
    id: id(304),
    business_id: id(4), // Nafees Restaurant
    shelter_id: id(104), // Feeding India
    driver_id: null,
    food_description: "35 biryani portions + raita",
    quantity: 35,
    expires_at: h(3),
    status: "pending",
  },
  {
    id: id(305),
    business_id: id(5), // Shree Gurukripa
    shelter_id: id(101), // Muskan Foundation
    driver_id: null,
    food_description: "60 poha plates + sev",
    quantity: 60,
    expires_at: h(0.75),
    status: "pending",
  },
  {
    id: id(306),
    business_id: id(6), // Rajwada Poha Corner
    shelter_id: id(103), // Annapurna Rasoi
    driver_id: null,
    food_description: "30 poha + jalebi combos",
    quantity: 30,
    expires_at: h(2.5),
    status: "pending",
  },
  {
    id: id(307),
    business_id: id(1), // Sarafa Bazaar
    shelter_id: id(104), // Feeding India
    driver_id: null,
    food_description: "15 dal-bafla trays",
    quantity: 15,
    expires_at: h(4),
    status: "pending",
  },
  {
    id: id(308),
    business_id: id(4), // Nafees Restaurant
    shelter_id: id(102), // Robin Hood Army
    driver_id: null,
    food_description: "45 seekh kebab + roti packs",
    quantity: 45,
    expires_at: h(1.25),
    status: "pending",
  },
];
