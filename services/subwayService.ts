
import { ApiResponse, RealtimeArrival, RealtimePosition } from '../types';

const API_KEY = "6566716d727379753733496b634359";
const BASE_URL = "http://swopenAPI.seoul.go.kr/api/subway";

/**
 * Robust fetcher that tries multiple CORS proxies to get around browser restrictions.
 * Seoul Open Data API is HTTP-only and lacks CORS headers, making it hard to call from HTTPS web apps.
 */
const fetchWithHandling = async (targetUrl: string) => {
  // Append timestamp to target URL to prevent proxy caching (ensure fresh real-time data)
  // Check if targetUrl already has query params
  const separator = targetUrl.includes('?') ? '&' : '?';
  const urlWithTimestamp = `${targetUrl}${separator}ts=${new Date().getTime()}`;

  // Strategy List
  const strategies = [
    // 1. AllOrigins (Raw JSON)
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 2. CORSProxy.io
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  let lastError: any;

  // Attempt Proxies
  for (const createProxyUrl of strategies) {
    try {
      const proxyUrl = createProxyUrl(urlWithTimestamp);
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn("Proxy attempt failed, trying next...", e);
      lastError = e;
    }
  }

  // 3. Fallback: Direct Fetch
  // Works if user has a CORS extension or if the app is running in a non-strict environment
  try {
    console.warn("All proxies failed, attempting direct fetch...");
    const response = await fetch(urlWithTimestamp);
    if (!response.ok) {
      throw new Error(`Direct API Error: ${response.status}`);
    }
    return await response.json();
  } catch (directError) {
    console.error("Critical: All fetch strategies failed.", directError);
    // Throw the original proxy error if it exists, as it's often more relevant (e.g., Network Error)
    throw lastError || directError;
  }
};

/**
 * Clean station name (remove '역' suffix if present)
 */
export const cleanStationName = (name: string): string => {
  return name.endsWith('역') ? name.slice(0, -1) : name;
};

/**
 * Get Real-time Arrival Data for a Station
 * Used to select the train at departure and to check arrival at destination.
 */
export const getRealtimeArrival = async (stationName: string): Promise<RealtimeArrival[]> => {
  const cleanedName = cleanStationName(stationName);
  const encodedName = encodeURIComponent(cleanedName);
  // Fetching up to 20 results to ensure we see enough trains
  const url = `${BASE_URL}/${API_KEY}/json/realtimeStationArrival/0/20/${encodedName}`;
  
  const data: ApiResponse<RealtimeArrival> = await fetchWithHandling(url);
  return data.realtimeArrivalList || [];
};

/**
 * Get Real-time Position of all trains on a specific line.
 * Used to track where the train is currently located while en route.
 */
export const getRealtimePosition = async (subwayId: string): Promise<RealtimePosition[]> => {
  const url = `${BASE_URL}/${API_KEY}/json/realtimePosition/0/50/${subwayId}`;
  
  const data: ApiResponse<RealtimePosition> = await fetchWithHandling(url);
  return data.realtimePositionList || [];
};

/**
 * Maps Line ID to readable name (partial list for display)
 */
export const getLineName = (subwayId: string): string => {
  const map: Record<string, string> = {
    "1001": "1호선", "1002": "2호선", "1003": "3호선", "1004": "4호선",
    "1005": "5호선", "1006": "6호선", "1007": "7호선", "1008": "8호선",
    "1009": "9호선", "1063": "경의중앙", "1065": "공항철도", "1067": "경춘선",
    "1075": "수인분당", "1077": "신분당", "1032": "GTX-A"
  };
  return map[subwayId] || "지하철";
};
