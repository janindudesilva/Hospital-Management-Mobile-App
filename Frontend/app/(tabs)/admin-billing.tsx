import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminBilling() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/billing/transactions');
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Fetch transactions error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
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
        data={transactions}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconContainer, { backgroundColor: item.status === 'paid' ? '#D1FAE5' : '#FEF3C7' }]}>
                <Ionicons 
                  name={item.status === 'paid' ? 'checkmark-circle' : 'time'} 
                  size={24} 
                  color={item.status === 'paid' ? '#059669' : '#D97706'} 
                />
              </View>
              <View style={styles.details}>
                <Text style={styles.patientName}>{item.patient?.user?.fullName || 'Unknown Patient'}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amount}>LKR {item.amount}</Text>
                <Text style={[styles.status, { color: item.status === 'paid' ? '#059669' : '#D97706' }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No transactions found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  details: { flex: 1, marginLeft: 12 },
  patientName: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  date: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 2 },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '800', color: Theme.colors.text },
  status: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: Theme.colors.textMuted, fontSize: 16 }
});
