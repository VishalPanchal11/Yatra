import { useAuth } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { ReactNativeModal } from "react-native-modal";

import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { PaymentProps } from "@/types/type";

const Payment = ({
  fullName,
  email,
  amount,
  driverId,
  rideTime,
}: PaymentProps) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    userAddress,
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationAddress,
    destinationLongitude,
  } = useLocationStore();

  const { userId } = useAuth();
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  console.log("Current user ID:", userId);

  const openPaymentSheet = async () => {
    setLoading(true);
    try {
      await initializePaymentSheet();
      const { error } = await presentPaymentSheet();

      if (error) {
        console.log("Payment error:", error);
        Alert.alert(`Error code: ${error.code}`, error.message);
        setLoading(false);
      } else {
        // Payment succeeded
        try {
          const rideData = {
            origin_address: userAddress,
            destination_address: destinationAddress,
            origin_latitude: userLatitude,
            origin_longitude: userLongitude,
            destination_latitude: destinationLatitude,
            destination_longitude: destinationLongitude,
            ride_time: rideTime.toFixed(0),
            fare_price: parseInt(amount) * 100,
            payment_status: "paid",
            driver_id: driverId,
            user_id: userId,
          };
          
          console.log("Creating ride with data:", rideData);
          console.log("USER ID: ", userId);
          
          // Create ride on successful payment
          const response = await fetch("/(api)/ride/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(rideData),
          });
          
          const responseText = await response.text();
          console.log("Ride creation raw response:", responseText);
          
          try {
            const jsonData = JSON.parse(responseText);
            console.log("Ride creation response:", jsonData);
            
            if (jsonData && jsonData.data) {
              console.log("Ride created successfully:", jsonData.data);
              setSuccess(true);
            } else {
              throw new Error("Ride creation response has no data");
            }
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            Alert.alert("Error", "Payment was successful but there was an error creating your ride.");
          }
        } catch (err) {
          console.error("Error creating ride:", err);
          Alert.alert("Error", "Payment was successful but there was an error creating your ride.");
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Payment process error:", err);
      Alert.alert("Payment Error", "There was an error processing your payment. Please try again.");
      setLoading(false);
    }
  };

  const initializePaymentSheet = async () => {
    try {
      // First create a payment intent on the server
      const { paymentIntent, ephemeralKey, customer } = await fetchAPI(
        "/(api)/(stripe)/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fullName || email.split("@")[0],
            email: email,
            amount: amount,
          }),
        },
      );

      if (!paymentIntent || !paymentIntent.client_secret) {
        throw new Error("Failed to create payment intent");
      }

      // Initialize the payment sheet with the payment intent
      const { error } = await initPaymentSheet({
        merchantDisplayName: "Yatra Rides",
        customerId: customer,
        returnURL: "myapp://book-ride",
        allowsDelayedPaymentMethods: true,
      });

      if (error) {
        console.log("Payment sheet initialization error:", error);
        Alert.alert("Payment Setup Error", error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("Payment initialization error:", err);
      Alert.alert("Payment Setup Error", "Failed to set up payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <CustomButton
        title={loading ? "Processing..." : "Confirm Ride"}
        className="my-10"
        onPress={openPaymentSheet}
        disabled={loading}
      />

      <ReactNativeModal
        isVisible={success}
        onBackdropPress={() => setSuccess(false)}
      >
        <View className="flex flex-col items-center justify-center bg-white p-7 rounded-2xl">
          <Image source={images.check} className="w-28 h-28 mt-5" />

          <Text className="text-2xl text-center font-JakartaBold mt-5">
            Booking placed successfully
          </Text>

          <Text className="text-md text-general-200 font-JakartaRegular text-center mt-3">
            Thank you for your booking. Your reservation has been successfully
            placed. Please proceed with your trip.
          </Text>

          <CustomButton
            title="Back Home"
            onPress={() => {
              setSuccess(false);
              router.push("/(root)/(tabs)/home");
            }}
            className="mt-5"
          />
        </View>
      </ReactNativeModal>
    </>
  );
};

export default Payment;