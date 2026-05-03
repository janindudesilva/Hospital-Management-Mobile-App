import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function PatientHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getDoctorName = (record: any) => {
    const name =
      record?.doctor?.fullName ||
      record?.doctor?.user?.fullName ||
      record?.appointment?.doctor?.fullName ||
      record?.appointment?.doctor?.user?.fullName;
    return name || 'Unknown';
  };

  const fetchRecords = async () => {
    try {
      const response = await api.get('/medical-records/patient');
      setRecords(response.data.data);
    } catch (error) {
      console.error('Fetch records error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
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
        data={records}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="medical" size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.doctorName}>Dr. {getDoctorName(item)}</Text>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Diagnosis</Text>
              <Text style={styles.value}>{item.diagnosis}</Text>
            </View>

            {item.notes ? (
              <View style={styles.section}>
                <Text style={styles.label}>Clinical Notes</Text>
                <Text style={styles.value}>{item.notes}</Text>
              </View>
            ) : null}

            {item.prescriptions && item.prescriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Prescriptions</Text>
                {item.prescriptions.map((p: any, idx: number) => (
                  <View key={idx} style={styles.medicationItem}>
                    <Ionicons name="flask-outline" size={16} color={Theme.colors.textMuted} />
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{p.medicationName}</Text>
                      <Text style={styles.medDetails}>{p.dosage} • {p.frequency} • {p.duration}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No medical history found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: Theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  headerText: { marginLeft: 16 },
  doctorName: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  date: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 4 },
  section: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  value: { fontSize: 15, color: Theme.colors.text, lineHeight: 22 },
  medicationItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Theme.colors.surface, padding: 12, borderRadius: 12, marginBottom: 8 },
  medInfo: { marginLeft: 12, flex: 1 },
  medName: { fontSize: 15, fontWeight: '600', color: Theme.colors.text },
  medDetails: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: Theme.colors.textMuted, fontSize: 16 }
});
