import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await api.get('/appointments/admin/all');
      setAppointments(response.data.data);
    } catch (error) {
      console.error('Fetch appointments error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDelete = (appointmentId: string) => {
    Alert.alert('Delete Booking', 'Are you sure you want to delete this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(appointmentId);
            await api.delete(`/appointments/admin/${appointmentId}`);
            setAppointments((prev: any[]) => prev.filter((appt) => appt._id !== appointmentId));
            Alert.alert('Success', 'Booking deleted successfully');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete booking');
          } finally {
            setDeletingId(null);
          }
        }
      }
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
              </View>
              <Text style={styles.date}>
                {new Date(item.appointmentDate).toLocaleDateString()} at {item.startTime}
              </Text>
            </View>
            <View style={styles.details}>
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={14} color={Theme.colors.textMuted} />
                <Text style={styles.detailText}>Patient: {item.patient?.fullName || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="medical-outline" size={14} color={Theme.colors.textMuted} />
                <Text style={styles.detailText}>Doctor: {item.doctor?.fullName || 'N/A'}</Text>
              </View>
            </View>
            <Pressable
              style={[styles.deleteBtn, deletingId === item._id && { opacity: 0.6 }]}
              onPress={() => handleDelete(item._id)}
              disabled={deletingId === item._id}
            >
              {deletingId === item._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                  <Text style={styles.deleteText}>Delete</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No appointments found</Text>}
      />
    </View>
  );
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'booked': return '#4F46E5';
    case 'completed': return '#10B981';
    case 'cancelled': return '#EF4444';
    case 'no_show': return '#F59E0B';
    default: return Theme.colors.textMuted;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  date: { fontSize: 13, fontWeight: '600', color: Theme.colors.text },
  details: { gap: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Theme.colors.textMuted },
  deleteBtn: { marginTop: 12, backgroundColor: Theme.colors.error, borderRadius: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  deleteText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: Theme.colors.textMuted, fontSize: 16 }
});
