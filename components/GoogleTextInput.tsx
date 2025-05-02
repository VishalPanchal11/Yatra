import { View, Image, Platform, Text } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

import { icons } from "@/constants";
import { GoogleInputProps } from "@/types/type";
import { PLACES_API_KEY } from "@/environment";

const GoogleTextInput = ({
  icon,
  initialLocation,
  containerStyle,
  textInputBackgroundColor,
  handlePress,
}: GoogleInputProps) => {
  // Define the empty component as a JSX element, not a function
  const EmptyListComponent = (
    <View className="p-2">
      <Image 
        source={icons.search}
        className="w-5 h-5 mr-4" 
        resizeMode="contain" 
      />
      <View className="border-t border-gray-200 my-2" />
      <View className="items-center">
        <Text className="text-gray-500">No results found</Text>
      </View>
    </View>
  );

  return (
    <View
      className={`flex flex-row items-center justify-center relative z-50 rounded-xl ${containerStyle}`}
    >
      <GooglePlacesAutocomplete
        fetchDetails={true}
        placeholder="Search"
        debounce={200}
        enablePoweredByContainer={false}
        minLength={2}
        listEmptyComponent={EmptyListComponent}
        styles={{
          container: {
            flex: 1,
            position: 'relative',
            width: '100%',
            zIndex: 999,
          },
          textInputContainer: {
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            marginHorizontal: 20,
            position: "relative",
            shadowColor: "#d4d4d4",
          },
          textInput: {
            backgroundColor: textInputBackgroundColor
              ? textInputBackgroundColor
              : "white",
            fontSize: 16,
            fontWeight: "600",
            marginTop: 5,
            width: "100%",
            borderRadius: 200,
            paddingLeft: 35, // Give space for the icon
            height: Platform.select({
              android: 54,
              ios: 50,
            }),
          },
          listView: {
            backgroundColor: textInputBackgroundColor
              ? textInputBackgroundColor
              : "white",
            position: "relative",
            top: 0,
            width: "100%",
            borderRadius: 10,
            shadowColor: "#d4d4d4",
            zIndex: 99,
          },
          row: {
            padding: 13,
            height: 60,
          },
          separator: {
            height: 1,
            backgroundColor: '#eee',
          },
          description: {
            fontSize: 14,
          },
          powered: {
            display: 'none',
          },
        }}
        onPress={(data, details = null) => {
          if (details) {
            handlePress({
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
              address: data.description,
            });
          }
        }}
        query={{
          key: PLACES_API_KEY,
          language: "en",
          components: 'country:in', // Limiting to India, change as needed
          types: 'establishment|geocode',
        }}
        renderLeftButton={() => (
          <View className=" z-10">
            <Image
              source={icon ? icon : icons.search}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </View>
        )}
        textInputProps={{
          placeholderTextColor: "gray",
          placeholder: initialLocation ?? "Where do you want to go?",
          clearButtonMode: "while-editing",
        }}
      />
    </View>
  );
};

export default GoogleTextInput;