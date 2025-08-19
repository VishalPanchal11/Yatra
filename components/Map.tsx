import * as React from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet, Alert, Dimensions } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import {
  calculateDriverTimes,
  calculateRegion,
  generateMarkersFromData,
} from "@/lib/map";
import { useDriverStore, useLocationStore } from "@/store";
import { Driver, MarkerData } from "@/types/type";
import { GOOGLE_MAPS_API_KEY, DIRECTIONS_API_KEY } from "@/environment";

const { width, height } = Dimensions.get('window');

const Map = () => {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();
  const { selectedDriver, setDrivers } = useDriverStore();

  const { data: drivers, loading, error } = useFetch<Driver[]>("/(api)/driver");
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [useDefaultProvider, setUseDefaultProvider] = useState(false);

  // Enhanced debugging
  useEffect(() => {
    console.log("=== MAP DEBUG INFO ===");
    console.log("User coordinates:", { userLatitude, userLongitude });
    console.log("Destination coordinates:", { destinationLatitude, destinationLongitude });
    console.log("API Keys status:", { 
      googleMaps: !!GOOGLE_MAPS_API_KEY, 
      directions: !!DIRECTIONS_API_KEY,
      googleMapsValue: GOOGLE_MAPS_API_KEY?.substring(0, 10) + "...",
      directionsValue: DIRECTIONS_API_KEY?.substring(0, 10) + "..."
    });
    console.log("Drivers data:", { drivers, loading, error });
    console.log("Markers:", markers.length);
    console.log("Map ready:", mapReady);
    console.log("Tiles loaded:", tilesLoaded);
    console.log("Using provider:", useDefaultProvider ? "DEFAULT" : "GOOGLE");
    console.log("=====================");
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude, drivers, markers, mapReady, tilesLoaded]);

  // Fallback to default provider if Google Maps fails
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapReady && !tilesLoaded && !useDefaultProvider) {
        console.log("Google Maps tiles failed to load, switching to default provider");
        setUseDefaultProvider(true);
        setMapReady(false);
        setTilesLoaded(false);
      }
    }, 8000); // Wait 8 seconds for tiles to load

    return () => clearTimeout(timer);
  }, [mapReady, tilesLoaded, useDefaultProvider]);

  // Add timeout for map loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) {
        setMapError("Map loading timeout. Checking API key configuration...");
        console.error("Map failed to load within 15 seconds");
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [mapReady]);

  useEffect(() => {
    // Validate API keys
    if (!GOOGLE_MAPS_API_KEY || !DIRECTIONS_API_KEY) {
      const errorMsg = "Missing Google Maps API keys";
      setMapError(errorMsg);
      console.error("Missing API keys:", { 
        google: !!GOOGLE_MAPS_API_KEY, 
        directions: !!DIRECTIONS_API_KEY 
      });
      return;
    }

    // Validate coordinates
    if (!userLatitude || !userLongitude) {
      console.warn("User coordinates not available yet");
      return;
    }

    // Check if coordinates are valid
    if (isNaN(userLatitude) || isNaN(userLongitude)) {
      setMapError("Invalid user coordinates");
      console.error("Invalid coordinates:", { userLatitude, userLongitude });
      return;
    }

    // Clear any previous errors if coordinates are valid
    setMapError(null);
  }, [GOOGLE_MAPS_API_KEY, DIRECTIONS_API_KEY, userLatitude, userLongitude]);

  useEffect(() => {
    if (Array.isArray(drivers)) {
      if (!userLatitude || !userLongitude) {
        console.log("Skipping marker generation - no user coordinates");
        return;
      }

      console.log("Generating markers for drivers:", drivers.length);
      const newMarkers = generateMarkersFromData({
        data: drivers,
        userLatitude,
        userLongitude,
      });

      console.log("Generated markers:", newMarkers.length);
      setMarkers(newMarkers);
    }
  }, [drivers, userLatitude, userLongitude]);

  useEffect(() => {
    if (
      markers.length > 0 &&
      destinationLatitude !== undefined &&
      destinationLongitude !== undefined
    ) {
      console.log("Calculating driver times...");
      calculateDriverTimes({
        markers,
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
      }).then((drivers) => {
        console.log("Driver times calculated:", drivers?.length);
        setDrivers(drivers as MarkerData[]);
      }).catch((err) => {
        console.error("Error calculating driver times:", err);
      });
    }
  }, [markers, destinationLatitude, destinationLongitude]);

  const region = calculateRegion({
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
  });

  console.log("Calculated region:", region);

  // Show loading if we don't have basic coordinates yet
  if (loading || (!userLatitude || !userLongitude)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000" />
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  // Show fetch error
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error fetching drivers: {error}</Text>
      </View>
    );
  }

  // Show map error
  if (mapError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{mapError}</Text>
        <Text style={styles.debugText}>
          Please check your Google Maps API key configuration
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={useDefaultProvider ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        showsTraffic={false}
        userLocationAnnotationTitle="You are here"
        mapType="standard"
        minZoomLevel={8}
        maxZoomLevel={20}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        onMapReady={() => {
          console.log("MapView onMapReady called");
          console.log("Current region:", region);
          console.log("Map dimensions:", width, height);
          setMapReady(true);
          
          // Set a timer to check if tiles loaded
          setTimeout(() => {
            setTilesLoaded(true);
            console.log("Tiles should be loaded by now");
          }, 3000);
        }}
        onError={(error) => {
          console.error("MapView error:", error);
          const errorMessage = error.nativeEvent?.message || 'Unknown map error';
          console.error("Detailed error:", errorMessage);
          
          // If Google provider fails, try default provider
          if (!useDefaultProvider) {
            console.log("Google Maps failed, trying default provider");
            setUseDefaultProvider(true);
            setMapReady(false);
          } else {
            setMapError(`Map error: ${errorMessage}`);
          }
        }}
        onMapLoaded={() => {
          console.log("MapView onMapLoaded called - tiles should be visible now");
          setTilesLoaded(true);
        }}
        onUserLocationChange={(location) => {
          console.log("User location changed:", location.nativeEvent);
        }}
        onRegionChangeComplete={(newRegion) => {
          console.log("Region changed:", newRegion);
        }}
        onLayout={(event) => {
          console.log("MapView layout:", event.nativeEvent.layout);
        }}
        onPress={(event) => {
          console.log("Map pressed:", event.nativeEvent.coordinate);
        }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={`Rating: ${marker.rating} | Seats: ${marker.car_seats}`}
            image={
              selectedDriver === +marker.id ? icons.selectedMarker : icons.marker
            }
            onPress={() => {
              console.log("Marker pressed:", marker.title);
              console.log("Marker coordinates:", marker.latitude, marker.longitude);
            }}
          />
        ))}

        {destinationLatitude && destinationLongitude && DIRECTIONS_API_KEY && (
          <>
            <Marker
              key="destination"
              coordinate={{
                latitude: destinationLatitude,
                longitude: destinationLongitude,
              }}
              title="Destination"
              description="Your destination"
              image={icons.pin}
              onPress={() => console.log("Destination marker pressed")}
            />
            {useDefaultProvider ? null : ( // Skip directions for default provider
              <MapViewDirections
                origin={{
                  latitude: userLatitude!,
                  longitude: userLongitude!,
                }}
                destination={{
                  latitude: destinationLatitude,
                  longitude: destinationLongitude,
                }}
                apikey={DIRECTIONS_API_KEY}
                strokeColor="#0286FF"
                strokeWidth={3}
                onReady={(result) => {
                  console.log("Directions ready:", result.distance, result.duration);
                }}
                onError={(error: any) => {
                  console.error("Directions error:", error);
                }}
              />
            )}
          </>
        )}
      </MapView>
      
      {/* Show loading overlay only if map isn't ready */}
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0286FF" />
          <Text style={styles.loadingText}>
            {useDefaultProvider ? "Loading default map..." : "Loading Google Maps..."}
          </Text>
        </View>
      )}

      {/* Show tiles loading overlay */}
      {mapReady && !tilesLoaded && !useDefaultProvider && (
        <View style={styles.tilesOverlay}>
          <ActivityIndicator size="small" color="#0286FF" />
          <Text style={styles.loadingText}>Loading map tiles...</Text>
        </View>
      )}

      {/* Enhanced debug overlay for development */}
      {__DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            Map Ready: {mapReady ? "✓" : "✗"} | Tiles: {tilesLoaded ? "✓" : "✗"}
          </Text>
          <Text style={styles.debugText}>
            Provider: {useDefaultProvider ? "DEFAULT" : "GOOGLE"}
          </Text>
          <Text style={styles.debugText}>
            Coords: {userLatitude?.toFixed(4)}, {userLongitude?.toFixed(4)}
          </Text>
          <Text style={styles.debugText}>
            Markers: {markers.length}
          </Text>
          <Text style={styles.debugText}>
            Region: {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
          </Text>
          <Text style={styles.debugText}>
            Delta: {region.latitudeDelta.toFixed(4)}, {region.longitudeDelta.toFixed(4)}
          </Text>
        </View>
      )}

      {/* API Key warning for development */}
      {__DEV__ && mapReady && !tilesLoaded && !useDefaultProvider && (
        <View style={styles.warningOverlay}>
          <Text style={styles.warningText}>
            ⚠️ Google Maps tiles not loading
          </Text>
          <Text style={styles.warningSubtext}>
            Check API key restrictions & billing
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    minHeight: 300, // Minimum height instead of fixed
  },
  map: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  tilesOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -25 }],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 8,
    zIndex: 999,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    fontWeight: '500',
  },
  debugText: {
    fontSize: 10,
    color: '#333',
    textAlign: 'left',
    marginTop: 2,
  },
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 5,
    zIndex: 999,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  warningOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 193, 7, 0.95)',
    padding: 12,
    borderRadius: 8,
    zIndex: 998,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default Map;