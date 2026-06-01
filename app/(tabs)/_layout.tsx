import { Tabs } from 'expo-router'
import { House, Compass, Bell, CircleUser } from 'lucide-react-native'
import TabBar, { TAB_BAR_HEIGHT } from '@/components/TabBar'
import { BG } from '@/lib/theme'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: BG },
        tabBarStyle: { height: TAB_BAR_HEIGHT },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <House size={22} color={color} stroke={color} strokeWidth={2.0} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => (
            <Compass size={22} color={color} stroke={color} strokeWidth={2.0} />
          ),
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color }) => (
            <Bell size={22} color={color} stroke={color} strokeWidth={2.0} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <CircleUser size={22} color={color} stroke={color} strokeWidth={2.0} />
          ),
        }}
      />
    </Tabs>
  )
}

