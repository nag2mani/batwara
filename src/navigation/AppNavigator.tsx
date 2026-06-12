import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import GroupsScreen from "../screens/GroupsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { C } from "../theme/colors";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor:   C.green,
        tabBarInactiveTintColor: C.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ["grid",           "grid-outline"],
            Expenses:  ["receipt",        "receipt-outline"],
            Groups:    ["people",         "people-outline"],
            Settings:  ["person-circle",  "person-circle-outline"],
          };
          const [active, inactive] = icons[route.name] ?? ["ellipse", "ellipse-outline"];
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Expenses"  component={ExpensesScreen} />
      <Tab.Screen name="Groups"    component={GroupsScreen} />
      <Tab.Screen name="Settings"  component={SettingsScreen} />
    </Tab.Navigator>
  );
}
