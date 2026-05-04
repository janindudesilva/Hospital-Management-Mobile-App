import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

/** API / persisted docs may use different casing; UI must not hide actions due to case mismatch */
function normalizeAppointmentStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toLowerCase();
}

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    load(false);
  }, []);

  const load = async (fromPullRefresh: boolean) => {
    try {
      if (fromPullRefresh) setRefreshing(true);
      else setLoading(true);
      const response = await api.get('/appointments/my');
      setAppointments(response.data.data);
    } catch (error) {
      console.error('Fetch appointments error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: unknown) => {
    switch (normalizeAppointmentStatus(status)) {
      case 'booked':
        return '#0284c7';
      case 'completed':
        return '#16a34a';
      case 'cancelled':
        return '#dc2626';
      case 'no_show':
        return Theme.colors.textMuted;
      default:
        return Theme.colors.textMuted;
    }
  };

  const sessionLabel = (type?: string) => {
    if (!type) return null;
    if (type === 'offline') return 'Physical Session';
    if (type === 'online') return 'Online Session';
    if (type === 'emergency') return 'Emergency';
    return type;
  };

  /** Allow reschedule/cancel for active bookings only (not completed or cancelled) */
  const canManage = (status: unknown) => normalizeAppointmentStatus(status) === 'booked';

  const goReschedule = (item: any) => {
    const doc = item.doctor;
    if (!doc?._id) {
      Alert.alert('Error', 'Doctor information is missing');
      return;
    }
    router.push({
      pathname: '/appointments/new',
      params: {
        doctorId: String(doc._id),
        doctorName: String(doc.fullName || ''),
        doctorFee: String(doc.consultationFee ?? 0),
        appointmentId: String(item._id),
        mode: 'reschedule',
        appointmentDate: new Date(item.appointmentDate).toISOString(),
        currentSlot: String(item.startTime || '')
      }
    });
  };

  const confirmCancel = (item: any) => {
    Alert.alert(
      'Cancel appointment',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: () => cancelAppointment(item._id)
        }
      ]
    );
  };

  const cancelAppointment = async (id: string) => {
    try {
      setActionId(id);
      await api.post(`/appointments/my/${id}/cancel`);
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: 'cancelled' } : a))
      );
      Alert.alert('Cancelled', 'Your appointment has been cancelled.');
    } catch (error: any) {
      Alert.alert('Could not cancel', error?.response?.data?.message || 'Please try again.');
    } finally {
      setActionId(null);
    }
  };

  if (loading && appointments.length === 0) {
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
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 88 }
        ]}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const manage = canManage(item.status);
          const busy = actionId === item._id;
          const statusKey = normalizeAppointmentStatus(item.status) || 'booked';
          const statusLabel = statusKey.replace(/_/g, ' ').toUpperCase();
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.doctorInfo}>
                  <Ionicons name="medical" size={18} color={Theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.doctorName}>{item.doctor?.fullName || 'General Hospital'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(statusKey) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(statusKey) }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.details}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <Text style={styles.detailText}>
                    {new Date(item.appointmentDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <Text style={styles.detailText}>
                    {item.startTime} - {item.endTime}
                  </Text>
                </View>
                {sessionLabel(item.type) && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
                    <Text style={styles.detailText}>{sessionLabel(item.type)}</Text>
                  </View>
                )}
              </View>

              {manage ? (
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.secondaryBtn, busy && styles.btnDisabled]}
                    onPress={() => goReschedule(item)}
                    disabled={busy}
                  >
                    <Ionicons name="calendar-outline" size={18} color={Theme.colors.primary} style={styles.actionIcon} />
                    <Text style={styles.secondaryBtnText}>Reschedule</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.dangerBtn, busy && styles.btnDisabled]}
                    onPress={() => confirmCancel(item)}
                    disabled={busy}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#b91c1c" style={styles.actionIcon} />
                    <Text style={styles.dangerBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={48} color={Theme.colors.textMuted} />
            <Text style={styles.emptyText}>No appointments scheduled</Text>
          </View>
        }
        onRefresh={() => load(true)}
        refreshing={refreshing}
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
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  doctorInfo: { flexDirection: 'row', alignItems: 'center' },
  doctorName: { fontSize: 17, fontWeight: '700', color: Theme.colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginBottom: 12 },
  details: {},
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 14, color: Theme.colors.text },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '10'
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: Theme.colors.primary },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2'
  },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: '#b91c1c' },
  actionIcon: { marginRight: 6 },
  btnDisabled: { opacity: 0.55 },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, fontSize: 16, color: Theme.colors.textMuted }
});
