import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import RideCard from "@/components/RideCard";
import { icons, images } from "@/constants";
import { useLocationStore } from "@/store";
import { Ride } from "@/types/type";

const Home = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRides, setUpdatingRides] = useState(false);

  const { setUserLocation, setDestinationLocation } = useLocationStore();

  const handleSignOut = () => {
    signOut();
    router.replace("/(auth)/sign-in");
  };

  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const fetchRides = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Make a direct fetch call
      const response = await fetch(`/(api)/ride/${user.id}`);
      const responseText = await response.text();
      console.log("Raw API response (Home):", responseText);
      
      try {
        const jsonData = JSON.parse(responseText);
        console.log("Parsed response (Home):", jsonData);
        
        if (jsonData && jsonData.data) {
          setRecentRides(jsonData.data);
        } else {
          setError("No ride data returned from API");
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        setError("Failed to parse API response");
      }
    } catch (err) {
      console.error("Error fetching rides:", err);
      setError("Failed to load rides");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const updateRidesWithUserId = async () => {
    if (!user?.id) return;
    
    try {
      setUpdatingRides(true);
      const response = await fetch("/(api)/ride/update-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      
      const result = await response.json();
      console.log("Update user_id result:", result);
      
      // Refresh the rides list
      fetchRides();
    } catch (err) {
      console.error("Error updating rides with user_id:", err);
    } finally {
      setUpdatingRides(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords?.latitude!,
        longitude: location.coords?.longitude!,
      });

      setUserLocation({
        latitude: location.coords?.latitude,
        longitude: location.coords?.longitude,
        address: `${address[0].name}, ${address[0].region}`,
      });
    })();
  }, []);

  const handleDestinationPress = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setDestinationLocation(location);

    router.push("/(root)/find-ride");
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRides();
  }, [fetchRides]);

  return (
    <SafeAreaView className="bg-general-500">
      <FlatList
        data={recentRides?.slice(0, 5)}
        renderItem={({ item }) => <RideCard ride={item} />}
        keyExtractor={(item, index) => `${item.origin_address}-${item.destination_address}-${index}`}
        className="px-5"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        ListEmptyComponent={() => (
          <View className="flex flex-col items-center justify-center">
            {!loading ? (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No recent rides found"
                  resizeMode="contain"
                />
                <Text className="text-sm mb-2">No recent rides found</Text>
                {error && (
                  <Text className="text-red-500 text-sm">{error}</Text>
                )}
                <TouchableOpacity 
                  onPress={fetchRides}
                  className="bg-white mt-3 px-4 py-2 rounded-lg mb-3"
                >
                  <Text>Refresh Rides</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={updateRidesWithUserId}
                  disabled={updatingRides}
                  className="bg-blue-500 px-4 py-2 rounded-lg mt-2"
                >
                  <Text className="text-white">
                    {updatingRides ? "Fixing rides..." : "Fix My Rides"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <ActivityIndicator size="small" color="#000" />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            <View className="flex flex-row items-center justify-between my-5">
              <Text className="text-2xl font-JakartaExtraBold">
                Welcome {user?.firstName}👋
              </Text>
              <TouchableOpacity
                onPress={handleSignOut}
                className="justify-center items-center w-10 h-10 rounded-full bg-white"
              >
                <Image source={icons.out} className="w-4 h-4" />
              </TouchableOpacity>
            </View>

            <GoogleTextInput
              icon={icons.search}
              containerStyle="bg-white shadow-md shadow-neutral-300"
              handlePress={handleDestinationPress}
            />

            <>
              <Text className="text-xl font-JakartaBold mt-5 mb-3">
                Your current location
              </Text>
              <View style={{ 
                height: 300, 
                width: '100%', 
                borderRadius: 16, 
                overflow: 'hidden',
                marginBottom: 10
              }}>
                <Map />
              </View>
            </>

            <Text className="text-xl font-JakartaBold mt-5 mb-3">
              Recent Rides
            </Text>
          </>
        }
      />
    </SafeAreaView>
  );
};

export default Home;