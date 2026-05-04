import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function PatientBilling() {
  const [bills, setBills] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal and Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [form, setForm] = useState({ cardHolderName: '', cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '' });
  const uniqueCards = useMemo(() => {
    const cardMap = new Map<string, any>();
    for (const card of cards) {
      const key = `${card.cardHolderName}-${card.last4}-${card.expiryMonth}-${card.expiryYear}`;
      if (!cardMap.has(key)) {
        cardMap.set(key, card);
      }
    }
    return Array.from(cardMap.values());
  }, [cards]);

  const fetchData = async () => {
    try {
      const [billsRes, cardsRes] = await Promise.all([
        api.get('/billing/my'),
        api.get('/billing/cards')
      ]);
      setBills(billsRes.data.data);
      setCards(cardsRes.data.data);
      const fetchedCards = cardsRes.data.data;
      setCards(fetchedCards);
      if (fetchedCards.length > 0 && !selectedCardId) {
        setSelectedCardId(fetchedCards[0]._id);
      }
    } catch (error) {
      console.error('Fetch billing error:', error);
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

  const handleAddCard = async () => {
    if (!editingCardId && (!form.cardNumber || form.cardNumber.length < 16)) {
      return Alert.alert('Validation', 'Please enter a valid 16-digit card number');
    }
    if (editingCardId && form.cardNumber && form.cardNumber.length < 16) {
      return Alert.alert('Validation', 'Please enter a valid 16-digit card number');
    }
    try {
      setSavingCard(true);
      if (editingCardId) {
        await api.patch(`/billing/cards/${editingCardId}`, form);
        Alert.alert('Success', 'Card updated');
      } else {
        await api.post('/billing/cards', form);
        Alert.alert('Success', 'Card added securely');
      }
      setModalVisible(false);
      setEditingCardId(null);
      setForm({ cardHolderName: '', cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '' });
      await fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || `Failed to ${editingCardId ? 'update' : 'add'} card`);
    } finally {
      setSavingCard(false);
    }
  };

  const openEditCard = (card: any) => {
    setEditingCardId(card._id);
    setForm({
      cardHolderName: card.cardHolderName || '',
      cardNumber: '',
      expiryMonth: card.expiryMonth || '',
      expiryYear: card.expiryYear || '',
      cvv: ''
    });
    setModalVisible(true);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert('Delete Card', 'Are you sure you want to delete this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/billing/cards/${cardId}`);
            if (selectedCardId === cardId) {
              setSelectedCardId(null);
            }
            await fetchData();
            Alert.alert('Success', 'Card deleted');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete card');
          }
        }
      }
    ]);
  };

  const handlePay = async () => {
    if (!selectedCardId) return Alert.alert('Error', 'Please add a payment card first');
    try {
      setPaying(true);
      await api.post('/billing/pay', { billId: selectedBill._id, cardId: selectedCardId });
      Alert.alert('Success', 'Payment processed successfully');
      setPayModalVisible(false);
      fetchData();
    } catch (e: any) {
      Alert.alert('Payment Failed', e.response?.data?.message || 'Transaction could not be completed');
    } finally {
      setPaying(false);
    }
  };

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Theme.colors.primary} /></View>;
  }

  const renderHeader = () => (
    <View style={styles.cardsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Saved Cards</Text>
        <Pressable onPress={() => setModalVisible(true)}>
          <Text style={styles.addCardText}>+ Add New</Text>
        </Pressable>
      </View>
      
      {uniqueCards.length === 0 ? (
        <View style={styles.emptyCardBox}>
          <Ionicons name="card-outline" size={32} color={Theme.colors.textMuted} />
          <Text style={styles.emptyText}>No cards saved</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={uniqueCards}
          keyExtractor={(c: any) => c._id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.creditCard}>
              <Ionicons name="card" size={32} color="#fff" />
              <Text style={styles.cardNumber}>**** **** **** {item.last4}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardName}>{item.cardHolderName.toUpperCase()}</Text>
                <Text style={styles.cardExpiry}>{item.expiryMonth}/{item.expiryYear}</Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable style={styles.cardActionBtn} onPress={() => openEditCard(item)}>
                  <Ionicons name="create-outline" size={14} color="#fff" />
                  <Text style={styles.cardActionText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.cardActionBtn} onPress={() => handleDeleteCard(item._id)}>
                  <Ionicons name="trash-outline" size={14} color="#fff" />
                  <Text style={styles.cardActionText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 16 }]}>Invoices</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        keyExtractor={(item: any) => item._id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.billCard}>
            <View style={styles.billHeader}>
              <View>
                <Text style={styles.billDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.billId}>INV-{item._id.slice(-6).toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.statusText, { color: item.status === 'paid' ? '#059669' : '#D97706' }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            {item.items.map((i: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemDesc}>{i.description}</Text>
                <Text style={styles.itemCost}>LKR {i.cost.toFixed(2)}</Text>
              </View>
            ))}
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>LKR {item.amount.toFixed(2)}</Text>
            </View>

            {item.status === 'pending' && (
              <Pressable 
                style={styles.payButton} 
                onPress={() => { setSelectedBill(item); setPayModalVisible(true); }}
              >
                <Text style={styles.payButtonText}>Pay Now</Text>
              </Pressable>
            )}
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No invoices found</Text>}
      />

      {/* Add Card Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCardId ? 'Edit Payment Card' : 'Add Payment Card'}</Text>
            <TextInput style={styles.input} placeholder="Cardholder Name" value={form.cardHolderName} onChangeText={v => setForm({...form, cardHolderName: v})} />
            <TextInput style={styles.input} placeholder={editingCardId ? 'New Card Number (16 digits)' : 'Card Number (16 digits)'} keyboardType="number-pad" maxLength={16} value={form.cardNumber} onChangeText={v => setForm({...form, cardNumber: v})} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="MM" keyboardType="number-pad" maxLength={2} value={form.expiryMonth} onChangeText={v => setForm({...form, expiryMonth: v})} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="YY" keyboardType="number-pad" maxLength={2} value={form.expiryYear} onChangeText={v => setForm({...form, expiryYear: v})} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="CVV" keyboardType="number-pad" maxLength={3} secureTextEntry value={form.cvv} onChangeText={v => setForm({...form, cvv: v})} />
            </View>
            <Text style={styles.secureNote}>🔒 CVV is verified but not stored on our servers.</Text>
            
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setModalVisible(false);
                  setEditingCardId(null);
                  setForm({ cardHolderName: '', cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '' });
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, savingCard && { opacity: 0.6 }]} onPress={handleAddCard} disabled={savingCard}>
                {savingCard ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingCardId ? 'Update Card' : 'Save Card'}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Confirmation Modal */}
      <Modal visible={payModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <Text style={styles.payAmountText}>LKR {selectedBill?.amount?.toFixed(2)}</Text>
            
            <Text style={styles.label}>Select Payment Method</Text>
            {uniqueCards.length === 0 ? (
              <Text style={{ color: Theme.colors.error, marginBottom: 20 }}>No saved cards. Please add a card first.</Text>
            ) : (
              uniqueCards.map((c: any) => (
                <Pressable 
                  key={c._id} 
                  style={[styles.cardSelectBtn, selectedCardId === c._id && styles.cardSelectActive]}
                  onPress={() => setSelectedCardId(c._id)}
                >
                  <Ionicons name="card" size={24} color={selectedCardId === c._id ? Theme.colors.primary : Theme.colors.textMuted} />
                  <Text style={[styles.cardSelectText, selectedCardId === c._id && { color: Theme.colors.primary }]}>
                    •••• {c.last4}
                  </Text>
                </Pressable>
              ))
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setPayModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: uniqueCards.length === 0 ? '#ccc' : Theme.colors.primary }]} onPress={handlePay} disabled={uniqueCards.length === 0 || paying}>
                {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Pay Now</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardsSection: { marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
  addCardText: { fontSize: 14, fontWeight: '700', color: Theme.colors.primary },
  emptyCardBox: { height: 120, backgroundColor: Theme.colors.surface, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: Theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 8, color: Theme.colors.textMuted, fontWeight: '600' },
  creditCard: { width: 280, height: 160, backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginRight: 16, justifyContent: 'space-between', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cardNumber: { color: '#fff', fontSize: 20, letterSpacing: 2, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardName: { color: '#CBD5E1', fontSize: 14, fontWeight: '500' },
  cardExpiry: { color: '#CBD5E1', fontSize: 14, fontWeight: '500' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cardActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  
  billCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billDate: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  billId: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemDesc: { fontSize: 14, color: Theme.colors.textMuted },
  itemCost: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  totalAmount: { fontSize: 18, fontWeight: '800', color: Theme.colors.primary },
  payButton: { backgroundColor: Theme.colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  payButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 40, color: Theme.colors.textMuted, fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, color: Theme.colors.text },
  input: { backgroundColor: Theme.colors.background, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  secureNote: { fontSize: 11, color: '#059669', marginBottom: 20, marginTop: 4 },
  payAmountText: { fontSize: 32, fontWeight: '800', color: Theme.colors.primary, textAlign: 'center', marginVertical: 20 },
  label: { fontSize: 14, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 12 },
  cardSelectBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 12 },
  cardSelectActive: { borderColor: Theme.colors.primary, backgroundColor: Theme.colors.primary + '10' },
  cardSelectText: { fontSize: 16, fontWeight: '600', color: Theme.colors.text, marginLeft: 12 },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { padding: 12, paddingHorizontal: 20 },
  cancelText: { color: Theme.colors.textMuted, fontWeight: '600' },
  saveBtn: { backgroundColor: Theme.colors.primary, padding: 12, paddingHorizontal: 24, borderRadius: 12 },
  saveText: { color: '#fff', fontWeight: '700' }
});
