import React from "react";
import { View } from "react-native";

import ClosetTab from "./tabs/ClosetTab";
import HomeTab from "./tabs/HomeTab";
import WishlistTab from "./tabs/WishlistTab";
import ShopDashboard from "../shop/components/ShopDashboard";
import type { AppStyles } from "../styles/appStyles";

type Tab = "home" | "closet" | "wishlist" | "shop";

type Props = {
  activeTab: Tab;
  styles: AppStyles;
  homeTabProps: React.ComponentProps<typeof HomeTab>;
  closetTabProps: React.ComponentProps<typeof ClosetTab>;
  wishlistTabProps: React.ComponentProps<typeof WishlistTab>;
  shopDashboardProps: React.ComponentProps<typeof ShopDashboard>;
};

export default function ActiveTabContent({
  activeTab,
  styles,
  homeTabProps,
  closetTabProps,
  wishlistTabProps,
  shopDashboardProps,
}: Props) {
  return (
    <View style={styles.contentArea}>
      {activeTab === "home" ? <HomeTab {...homeTabProps} /> : null}
      {activeTab === "closet" ? <ClosetTab {...closetTabProps} /> : null}
      {activeTab === "wishlist" ? <WishlistTab {...wishlistTabProps} /> : null}
      {activeTab === "shop" ? <ShopDashboard {...shopDashboardProps} /> : null}
    </View>
  );
}
