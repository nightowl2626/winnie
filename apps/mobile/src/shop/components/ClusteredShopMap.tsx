import { Platform } from "react-native";

const ClusteredShopMap =
  Platform.OS === "web"
    ? require("./ClusteredShopMap.web").default
    : require("./ClusteredShopMap.native").default;

export default ClusteredShopMap;
