// Environment variables (Geoapify)
// Expo exposes variables prefixed with EXPO_PUBLIC_ at runtime
export const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

// Backwards-compatible exports used across the app
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
export const DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
export const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Debug logging in development
if (__DEV__) {
    console.log('Environment variables loaded:', {
      GEOAPIFY_API_KEY: GEOAPIFY_API_KEY ? 'Present' : 'Missing',
      GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing',
    });
  }