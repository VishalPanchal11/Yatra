import * as React from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet, Dimensions, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
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

  useEffect(() => {
    console.log("API Keys:", { 
      google: GOOGLE_MAPS_API_KEY, 
      directions: DIRECTIONS_API_KEY 
    });
    console.log("User Location:", { 
      latitude: userLatitude, 
      longitude: userLongitude 
    });
  }, []);

  useEffect(() => {
    if (Array.isArray(drivers)) {
      if (!userLatitude || !userLongitude) return;

      const newMarkers = generateMarkersFromData({
        data: drivers,
        userLatitude,
        userLongitude,
      });

      setMarkers(newMarkers);
    }
  }, [drivers, userLatitude, userLongitude]);

  useEffect(() => {
    if (
      markers.length > 0 &&
      destinationLatitude !== undefined &&
      destinationLongitude !== undefined
    ) {
      calculateDriverTimes({
        markers,
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
      }).then((drivers) => {
        setDrivers(drivers as MarkerData[]);
      });
    }
  }, [markers, destinationLatitude, destinationLongitude]);

  const region = calculateRegion({
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
  });

  if (loading || (!userLatitude && !userLongitude))
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );

  if (error)
    return (
      <View style={styles.container}>
        <Text>Error: {error}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        tintColor="black"
        mapType="standard"
        initialRegion={region}
        showsUserLocation={true}
        userInterfaceStyle="light"
        onMapReady={() => setMapReady(true)}
        loadingEnabled={true}
        loadingIndicatorColor="#0286FF"
      >
        {mapReady && markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            image={
              selectedDriver === +marker.id ? icons.selectedMarker : icons.marker
            }
          />
        ))}

        {mapReady && destinationLatitude && destinationLongitude && (
          <>
            <Marker
              key="destination"
              coordinate={{
                latitude: destinationLatitude,
                longitude: destinationLongitude,
              }}
              title="Destination"
              image={icons.pin}
            />
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
              strokeWidth={2}
            />
          </>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default Map;
