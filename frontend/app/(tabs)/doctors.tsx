import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorsScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctors');
      setDoctors(response.data.data);
    } catch (error) {
      console.error('Fetch doctors error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doctors}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.card} 
            onPress={() => router.push({ 
              pathname: '/appointments/new', 
              params: { doctorId: item._id, doctorName: item.fullName, doctorFee: item.consultationFee ?? 0 } 
            })}
          >
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={Theme.colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.specialization}>{item.specialization}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.department}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={Theme.colors.textMuted} />
            <Text style={styles.emptyText}>No doctors found</Text>
          </View>
        }
        onRefresh={fetchDoctors}
        refreshing={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  listContent: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: Theme.colors.text },
  specialization: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 6 },
  badge: { backgroundColor: Theme.colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600', color: Theme.colors.primary },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, fontSize: 16, color: Theme.colors.textMuted }
});
