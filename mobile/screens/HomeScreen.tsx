import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
    const { currentUser, logout } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {currentUser?.name}</Text>
                    <Text style={styles.role}>Unidade {currentUser?.houseNumber} • {currentUser?.role}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Sair</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Bem-vindo ao App!</Text>
                    <Text style={styles.cardText}>
                        Esta é a versão mobile nativa do sistema do Condomínio Porto Seguro.
                    </Text>
                    <Text style={[styles.cardText, { marginTop: 8 }]}>
                        Em breve todas as funcionalidades estarão disponíveis aqui.
                    </Text>
                </View>

                {/* Placeholder for Dashboard Metrics */}
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Ocorrências</Text>
                        <Text style={styles.gridValue}>0</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Reservas</Text>
                        <Text style={styles.gridValue}>0</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    greeting: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1e293b",
    },
    role: {
        fontSize: 14,
        color: "#64748b",
    },
    logoutButton: {
        padding: 8,
    },
    logoutText: {
        color: "#ef4444",
        fontWeight: "600",
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 8,
    },
    cardText: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
    },
    grid: {
        flexDirection: "row",
        gap: 16,
    },
    gridItem: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        elevation: 1,
    },
    gridLabel: {
        fontSize: 14,
        color: "#64748b",
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#4f46e5",
    },
});
