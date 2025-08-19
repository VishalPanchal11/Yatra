import { Driver, MarkerData } from "@/types/type";
import { DIRECTIONS_API_KEY } from "@/environment";

export const generateMarkersFromData = ({
  data,
  userLatitude,
  userLongitude,
}: {
  data: Driver[];
  userLatitude: number;
  userLongitude: number;
}): MarkerData[] => {
  return data.map((driver) => {
    const latOffset = (Math.random() - 0.5) * 0.01; // Random offset between -0.005 and 0.005
    const lngOffset = (Math.random() - 0.5) * 0.01; // Random offset between -0.005 and 0.005

    return {
      id: driver.driver_id,
      latitude: userLatitude + latOffset,
      longitude: userLongitude + lngOffset,
      title: `${driver.first_name} ${driver.last_name}`,
      ...driver,
    };
  });
};

export const calculateRegion = ({
  userLatitude,
  userLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  userLatitude: number | null;
  userLongitude: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}) => {
  // Default fallback region (San Francisco) - should rarely be used
  const defaultRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  if (!userLatitude || !userLongitude) {
    console.log("Using default region - no user coordinates");
    return defaultRegion;
  }

  // If no destination, center on user with reasonable zoom
  if (!destinationLatitude || !destinationLongitude) {
    console.log("Using user-centered region");
    return {
      latitude: userLatitude,
      longitude: userLongitude,
      latitudeDelta: 0.05, // Increased from 0.01 for better visibility
      longitudeDelta: 0.05, // Increased from 0.01 for better visibility
    };
  }

  // Calculate region to fit both user and destination
  const minLat = Math.min(userLatitude, destinationLatitude);
  const maxLat = Math.max(userLatitude, destinationLatitude);
  const minLng = Math.min(userLongitude, destinationLongitude);
  const maxLng = Math.max(userLongitude, destinationLongitude);

  const latitudeDelta = Math.max((maxLat - minLat) * 1.5, 0.05); // Minimum delta of 0.05
  const longitudeDelta = Math.max((maxLng - minLng) * 1.5, 0.05); // Minimum delta of 0.05

  const latitude = (userLatitude + destinationLatitude) / 2;
  const longitude = (userLongitude + destinationLongitude) / 2;

  console.log("Using calculated region for user + destination");
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
};

export const calculateDriverTimes = async ({
  markers,
  userLatitude,
  userLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  markers: MarkerData[];
  userLatitude: number | null;
  userLongitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
}) => {
  if (
    !userLatitude ||
    !userLongitude ||
    !destinationLatitude ||
    !destinationLongitude
  ) {
    console.log("Missing coordinates for driver time calculation");
    return;
  }

  try {
    const timesPromises = markers.map(async (marker) => {
      try {
        const responseToUser = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${marker.latitude},${marker.longitude}&destination=${userLatitude},${userLongitude}&key=${DIRECTIONS_API_KEY}`
        );
        
        if (!responseToUser.ok) {
          throw new Error(`HTTP error! status: ${responseToUser.status}`);
        }
        
        const dataToUser = await responseToUser.json();
        
        if (dataToUser.status !== 'OK') {
          throw new Error(`Directions API error: ${dataToUser.status}`);
        }
        
        const timeToUser = dataToUser.routes[0].legs[0].duration.value; // Time in seconds

        const responseToDestination = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${userLatitude},${userLongitude}&destination=${destinationLatitude},${destinationLongitude}&key=${DIRECTIONS_API_KEY}`
        );
        
        if (!responseToDestination.ok) {
          throw new Error(`HTTP error! status: ${responseToDestination.status}`);
        }
        
        const dataToDestination = await responseToDestination.json();
        
        if (dataToDestination.status !== 'OK') {
          throw new Error(`Directions API error: ${dataToDestination.status}`);
        }
        
        const timeToDestination = dataToDestination.routes[0].legs[0].duration.value; // Time in seconds

        const totalTime = (timeToUser + timeToDestination) / 60; // Total time in minutes
        const price = (totalTime * 0.5).toFixed(2); // Calculate price based on time

        return { ...marker, time: totalTime, price };
      } catch (markerError) {
        console.error(`Error calculating time for marker ${marker.id}:`, markerError);
        // Return marker with default values if calculation fails
        return { ...marker, time: 0, price: "0.00" };
      }
    });

    return await Promise.all(timesPromises);
  } catch (error) {
    console.error("Error calculating driver times:", error);
    return markers; // Return original markers if calculation fails
  }
};