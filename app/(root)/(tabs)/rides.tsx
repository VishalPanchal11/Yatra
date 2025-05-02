import { useUser } from "@clerk/clerk-expo";
import { ActivityIndicator, FlatList, Image, Text, View, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";

import RideCard from "@/components/RideCard";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { Ride } from "@/types/type";

const Rides = () => {
  const { user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRides, setUpdatingRides] = useState(false);

  const fetchRides = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Make a direct fetch call
      const response = await fetch(`/(api)/ride/${user.id}`);
      const responseText = await response.text();
      console.log("Raw API response:", responseText);
      
      try {
        const jsonData = JSON.parse(responseText);
        console.log("Parsed response:", jsonData);
        
        if (jsonData && jsonData.data) {
          setRides(jsonData.data);
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
      setIsLoading(false);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRides();
  }, [fetchRides]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={rides}
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
            {!isLoading ? (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No recent rides found"
                  resizeMode="contain"
                />
                <Text className="text-sm mb-2">No recent rides found</Text>
                {error && (
                  <Text className="text-red-500 text-sm mb-3">Error: {error}</Text>
                )}
                <TouchableOpacity 
                  onPress={fetchRides}
                  className="bg-general-500 px-4 py-2 rounded-lg mb-3"
                >
                  <Text>Try Again</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={updateRidesWithUserId}
                  disabled={updatingRides}
                  className="bg-blue-500 px-4 py-2 rounded-lg mt-3"
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
            <Text className="text-2xl font-JakartaBold my-5">All Rides</Text>
          </>
        }
      />
    </SafeAreaView>
  );
};

export default Rides;