import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
    const { currentUser, loadingAuth } = useAuth();

    if (loadingAuth) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {currentUser ? (
                <Stack.Screen name="Home" component={HomeScreen} />
            ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthContextWrapper />
        </SafeAreaProvider>
    );
}

// Wrapper to allow AuthProvider usage with NavigationContainer inside
// Actually NavigationContainer needs to be outside Stack, but inside AuthProvider if we want to use 'useAuth' in generic components inside Nav.
// But we want to use useAuth for Conditional Routing.
// Structure: SafeAreaProvider -> AuthProvider -> NavigationContainer -> RootNavigator(consumes Auth)

function AuthContextWrapper() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <RootNavigator />
            </NavigationContainer>
        </AuthProvider>
    );
}
