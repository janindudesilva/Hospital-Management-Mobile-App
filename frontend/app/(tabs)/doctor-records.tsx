import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorRecords() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  
  // Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([{ medicationName: '', dosage: '', frequency: '', duration: '' }]);
  const [saving, setSaving] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appointments/my');
      // Only show booked appointments that need records
      setAppointments(response.data.data.filter((a: any) => a.status === 'booked'));
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleOpenRecord = (appt: any) => {
    setSelectedAppt(appt);
    setDiagnosis('');
    setNotes('');
    setPrescriptions([{ medicationName: '', dosage: '', frequency: '', duration: '' }]);
    setModalVisible(true);
  };

  const addPrescriptionRow = () => {
    setPrescriptions([...prescriptions, { medicationName: '', dosage: '', frequency: '', duration: '' }]);
  };

  const updatePrescription = (index: number, field: string, value: string) => {
    const updated = [...prescriptions];
    (updated[index] as any)[field] = value;
    setPrescriptions(updated);
  };

  const removePrescriptionRow = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleSaveRecord = async () => {
    if (!diagnosis) return Alert.alert('Validation', 'Diagnosis is required');
    
    // Clean up empty prescriptions
    const validPrescriptions = prescriptions.filter(p => p.medicationName && p.dosage);

    try {
      setSaving(true);
      await api.post('/medical-records', {
        appointmentId: selectedAppt._id,
        diagnosis,
        notes,
        prescriptions: validPrescriptions
      });
      
      // Also generate a bill automatically
      await api.post('/billing/generate', {
        patientId: selectedAppt.patient._id,
        appointmentId: selectedAppt._id,
        items: [
          { description: 'Consultation Fee', cost: 1500 }, // Default fee
          ...validPrescriptions.map(p => ({ description: `Medication: ${p.medicationName}`, cost: 500 })) // Dummy cost
        ]
      });

      Alert.alert('Success', 'Medical record and invoice generated successfully');
      setModalVisible(false);
      fetchAppointments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save record');
    } finally {
      setSaving(false);
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
      <View style={styles.header}>
        <Text style={styles.title}>Pending Consultations</Text>
        <Text style={styles.subtitle}>Select an appointment to add medical records</Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.details}>
                <Text style={styles.name}>{item.patient?.fullName || 'Unknown Patient'}</Text>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()} at {item.time}</Text>
              </View>
              <Pressable style={styles.actionBtn} onPress={() => handleOpenRecord(item)}>
                <Ionicons name="add-circle" size={28} color={Theme.colors.primary} />
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>No pending consultations</Text>}
      />

      {/* Add Record Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Consultation Record</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={28} color={Theme.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.patientInfo}>Patient: {selectedAppt?.patient?.fullName}</Text>
            
            <Text style={styles.label}>Diagnosis *</Text>
            <TextInput 
              style={[styles.input, { minHeight: 80 }]} 
              placeholder="Primary diagnosis..." 
              multiline 
              value={diagnosis}
              onChangeText={setDiagnosis}
            />

            <Text style={styles.label}>Clinical Notes</Text>
            <TextInput 
              style={[styles.input, { minHeight: 100 }]} 
              placeholder="Additional observations..." 
              multiline 
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.prescriptionHeader}>
              <Text style={styles.label}>Prescriptions</Text>
              <Pressable style={styles.addMedBtn} onPress={addPrescriptionRow}>
                <Ionicons name="add" size={16} color={Theme.colors.primary} />
                <Text style={styles.addMedText}>Add Med</Text>
              </Pressable>
            </View>

            {prescriptions.map((med, index) => (
              <View key={index} style={styles.medRow}>
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput style={styles.inputSmall} placeholder="Medication Name" value={med.medicationName} onChangeText={v => updatePrescription(index, 'medicationName', v)} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="Dosage (e.g., 500mg)" value={med.dosage} onChangeText={v => updatePrescription(index, 'dosage', v)} />
                    <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="Freq (e.g., 1-0-1)" value={med.frequency} onChangeText={v => updatePrescription(index, 'frequency', v)} />
                    <TextInput style={[styles.inputSmall, { width: 80 }]} placeholder="Days" value={med.duration} onChangeText={v => updatePrescription(index, 'duration', v)} />
                  </View>
                </View>
                {prescriptions.length > 1 && (
                  <Pressable style={styles.removeBtn} onPress={() => removePrescriptionRow(index)}>
                    <Ionicons name="trash" size={20} color={Theme.colors.error} />
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.saveBtn} onPress={handleSaveRecord} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save & Complete</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: Theme.colors.text },
  subtitle: { fontSize: 14, color: Theme.colors.textMuted, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  details: { flex: 1, marginLeft: 16 },
  name: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  date: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 4 },
  actionBtn: { padding: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: Theme.colors.textMuted, fontSize: 16 },
  
  modalContainer: { flex: 1, backgroundColor: Theme.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
  modalBody: { flex: 1, padding: 20 },
  patientInfo: { fontSize: 16, fontWeight: '600', color: Theme.colors.primary, marginBottom: 20, backgroundColor: Theme.colors.primary + '15', padding: 12, borderRadius: 12 },
  label: { fontSize: 15, fontWeight: '700', color: Theme.colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, padding: 16, fontSize: 15, textAlignVertical: 'top' },
  inputSmall: { backgroundColor: '#fff', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 12, fontSize: 14 },
  prescriptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  addMedBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addMedText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 4 },
  medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  removeBtn: { marginLeft: 12, padding: 8 },
  modalFooter: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Theme.colors.border },
  saveBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
