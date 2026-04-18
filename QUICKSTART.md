# 🚀 Quick Start: Running Restaurant → NGO Routes

## Installation & Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
# Navigate to: http://localhost:5173
```

---

## 🎯 How to Use (Step-by-Step)

### 1️⃣ **Open the Dashboard**
   - URL: `http://localhost:5173`
   - You'll see the Live Map Dashboard

### 2️⃣ **Switch to "Restaurant Routes" Tab**
   - Look at the right sidebar
   - You'll see 3 tabs: "Active Pickups" | "Route Planner" | **"Restaurant Routes"** ← Click here

### 3️⃣ **Select Restaurants**
   ```
   ✅ Click checkboxes to select restaurants:
      □ Truffles Restaurant
      □ Vidyarthi Bhavan  
      □ Meghana Foods
   ```

### 4️⃣ **Select NGOs**
   ```
   ✅ Click checkboxes to select NGOs:
      □ Akshaya Patra Foundation
      □ Robin Hood Army Hub
      □ Feeding India Centre
      □ No Food Waste Depot
   ```

### 5️⃣ **Click "Calculate Route"**
   - The algorithm instantly calculates the optimized path
   - No waiting, no API calls!

### 6️⃣ **View Results**
   
   **In the sidebar:**
   ```
   ✅ Route Calculated
   
   Distance: 22.30 km
   Stops: 4
   Estimated Duration: ~45 minutes
   
   Route Steps:
   1. 📦 Pickup: Meghana Foods
      2.90 km from start
   2. 🎯 Dropoff: Akshaya Patra
      10.10 km total
   3. 📦 Pickup: Truffles  
      15.40 km total
   4. 🎯 Dropoff: Robin Hood
      22.30 km total
   ```

   **On the map:**
   ```
   📍 Magenta/pink polyline connecting all stops
   1️⃣ 2️⃣ 3️⃣ 4️⃣ Numbered markers for each stop
   ━━━━ Animated flowing line showing direction
   ```

---

## 🔧 Technical Details

### Architecture

```
User Interface (RestaurantNgoRouter.tsx)
      ↓
State Management (Index.tsx)
      ↓
Routing Algorithm (restaurantNgoRouting.ts)
      ├─ Input: restaurants[], ngos[], startPoint
      ├─ Algorithm: Greedy nearest-neighbor
      ├─ Math: Haversine distance (dijkstra.ts)
      └─ Output: RouteStop[], totalDistance, geoJSON
      ↓
Map Visualization (LiveMap.tsx)
      └─ Display: Leaflet polylines + markers
```

### Algorithm Complexity

- **Time**: O(n × m) where n=restaurants, m=NGOs
- **Space**: O(n + m)
- **No external dependencies**: Pure haversine math ✅

### Features

| Feature | Status | Notes |
|---------|--------|-------|
| Offline routing | ✅ | Works without internet |
| Demo data | ✅ | Bengaluru restaurants & NGOs |
| Multi-stop | ✅ | Unlimited pickups & dropoffs |
| Distance calc | ✅ | Haversine formula |
| Route display | ✅ | Leaflet map integration |
| OSRM fallback | ✅ | Optional real-road polylines |

---

## 📦 Files Modified

```
src/
├── lib/
│   ├── restaurantNgoRouting.ts     (NEW) - Core algorithm
│   ├── demoData.ts                 (UPDATED) - Add type field
│   └── dijkstra.ts                 (USED) - Haversine math
├── components/dashboard/
│   ├── RestaurantNgoRouter.tsx     (NEW) - UI component
│   ├── LiveMap.tsx                 (UPDATED) - Map rendering
│   └── RoutePanel.tsx              (USED) - Existing planner
├── hooks/
│   └── useLiveData.ts              (UPDATED) - Type definitions
└── pages/
    └── Index.tsx                   (UPDATED) - State & tabs

Root:
├── ROUTE_DEMO.md                   (NEW) - Detailed demo
└── test-routing.mjs                (NEW) - Standalone test
```

---

## 🧪 Testing Offline

The implementation is **fully testable without any external services**:

✅ **No OSRM API** - Uses haversine distance
✅ **No geocoding** - Uses hardcoded coordinates  
✅ **No database** - Uses demo data
✅ **No authentication** - Demo data publicly available

Simply start the dev server and test the UI!

---

## 🎨 UI Components

### RestaurantNgoRouter Component
- **Purpose**: Multi-select interface for route planning
- **Props**:
  - `restaurants: Business[]` - List to select from
  - `ngos: Shelter[]` - List to select from
  - `onRouteCalculated: (route) => void` - Callback with results
  - `startPoint?: GeoNode` - Custom origin (defaults to warehouse)

### Route Display
- **Map color**: Magenta/pink (#D41976)
- **Polyline style**: Animated dashed overlay
- **Markers**: Numbered (1️⃣2️⃣3️⃣4️⃣)
- **Info popup**: Shows stop name & cumulative distance

---

## 🔍 Live Debugging

### Browser DevTools
1. Open DevTools (F12)
2. Console tab
3. Look for route calculation logs
4. Inspect React state in Components tab

### Network Tab
- ✅ No external API calls to OSRM
- ✅ No geocoding requests
- ✅ Only local calculations

---

## ✨ Next Steps

### Enhancements (Optional)
- [ ] Add vehicle type selection (bike/car/van/truck)
- [ ] Add capacity constraints
- [ ] Add time window restrictions  
- [ ] Export route as PDF/image
- [ ] Real-time tracking integration

### Production Ready
- [x] Offline capability ✅
- [x] No external dependencies ✅
- [x] Demo data included ✅
- [x] Type-safe (TypeScript) ✅
- [x] Component based ✅

---

## 📞 Support

**Issue**: Route not calculating?
- Check browser console for errors
- Verify at least 1 restaurant + 1 NGO selected
- Try "Clear" button and recalculate

**Issue**: Map not showing route?
- Ensure "Restaurant Routes" tab is active
- Route should display in magenta/pink
- Click markers to see details

**Issue**: Want real road routing?
- OSRM integration already exists
- Requires internet + OSRM server
- Automatic fallback to haversine if unavailable

---

## 🎉 Summary

Your LiveMapDashboard now has a complete offline restaurant → NGO routing system!

**Key achievement**: ✅ Zero external dependencies for core routing
