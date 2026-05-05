import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  booked:    { bg: '#DBEAFE', text: '#1D4ED8' },
  completed: { bg: '#D1FAE5', text: '#059669' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
  no_show:   { bg: '#FEF3C7', text: '#D97706' },
};

export default function DoctorSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Patients state
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'patients'>('schedule');

  // Patient detail modal
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({
    diagnosis: '', notes: '',
    prescriptions: [{ medicationName: '', dosage: '', frequency: '', duration: '' }]
  });

  const loadPatientRecords = async (patientId: string) => {
    try {
      setRecordsLoading(true);
      const res = await api.get(`/medical-records/patient/${patientId}`);
      setRecords(res.data.data || []);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const resetRecordForm = () => {
    setRecordForm({
      diagnosis: '',
      notes: '',
      prescriptions: [{ medicationName: '', dosage: '', frequency: '', duration: '' }]
    });
    setEditingRecordId(null);
    setShowAddRecord(false);
  };

  const openPatientModal = async (appt: any) => {
    setSelectedAppt(appt);
    setModalVisible(true);
    resetRecordForm();
    await loadPatientRecords(appt.patient?._id);
  };

  const handleAddRecord = async () => {
    if (!recordForm.diagnosis.trim()) { Alert.alert('Error', 'Diagnosis is required'); return; }
    try {
      setSavingRecord(true);
      if (editingRecordId) {
        await api.put(`/medical-records/${editingRecordId}`, {
          diagnosis: recordForm.diagnosis,
          notes: recordForm.notes,
          prescriptions: recordForm.prescriptions.filter(
            (p) => p.medicationName.trim() && p.dosage.trim() && p.frequency.trim() && p.duration.trim()
          )
        });
        Alert.alert('Success', 'Medical record updated');
      } else {
        await api.post('/medical-records', {
          appointmentId: selectedAppt._id,
          diagnosis: recordForm.diagnosis,
          notes: recordForm.notes,
          prescriptions: recordForm.prescriptions.filter(
            (p) => p.medicationName.trim() && p.dosage.trim() && p.frequency.trim() && p.duration.trim()
          )
        });
        Alert.alert('Success', 'Medical record added');
      }
      resetRecordForm();
      await loadPatientRecords(selectedAppt.patient?._id);
      fetchPatients();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save record');
    } finally { setSavingRecord(false); }
  };

  const handleEditRecord = (record: any) => {
    setEditingRecordId(record._id);
    setRecordForm({
      diagnosis: record.diagnosis || '',
      notes: record.notes || '',
      prescriptions: record.prescriptions?.length
        ? record.prescriptions.map((p: any) => ({
            medicationName: p.medicationName || '',
            dosage: p.dosage || '',
            frequency: p.frequency || '',
            duration: p.duration || ''
          }))
        : [{ medicationName: '', dosage: '', frequency: '', duration: '' }]
    });
    setShowAddRecord(true);
  };

  const handleDeleteRecord = (recordId: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this medical record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/medical-records/${recordId}`);
            if (editingRecordId === recordId) {
              resetRecordForm();
            }
            await loadPatientRecords(selectedAppt.patient?._id);
            Alert.alert('Success', 'Medical record deleted');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete record');
          }
        }
      }
    ]);
  };

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM'
  ];

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schedules/my');
      setSchedules(response.data.data);
      const selectedDateString = selectedDate.toDateString();
      const existing = response.data.data.find((s: any) => new Date(s.date).toDateString() === selectedDateString);
      if (existing) {
        setActiveSlots(existing.availableSlots.map((s: any) => s.time));
      } else {
        setActiveSlots([]);
      }
    } catch (error) {
      console.error('Fetch schedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);
      const response = await api.get('/appointments/doctor');
      setPatients(response.data.data || []);
    } catch (error) {
      console.error('Fetch doctor patients error:', error);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => { fetchSchedule(); }, [selectedDate]);
  useEffect(() => { fetchPatients(); }, []);

  const toggleSlot = (time: string) => {
    if (activeSlots.includes(time)) {
      setActiveSlots(activeSlots.filter(t => t !== time));
    } else {
      setActiveSlots([...activeSlots, time]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/schedules/my', {
        date: selectedDate.toISOString(),
        availableSlots: activeSlots.map(time => ({ time }))
      });
      Alert.alert('Success', 'Availability updated successfully');
      fetchSchedule();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const next7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <View style={styles.container}>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Ionicons name="time-outline" size={18} color={activeTab === 'schedule' ? Theme.colors.primary : Theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'patients' && styles.tabActive]}
          onPress={() => setActiveTab('patients')}
        >
          <Ionicons name="people-outline" size={18} color={activeTab === 'patients' ? Theme.colors.primary : Theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'patients' && styles.tabTextActive]}>My Patients</Text>
          {patients.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{patients.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── SCHEDULE TAB ── */}
      {activeTab === 'schedule' && (
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Availability</Text>
            <Text style={styles.subtitle}>Select a date and tap slots to mark as available</Text>
          </View>

          <View style={styles.dateSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {next7Days.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                return (
                  <Pressable
                    key={index}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.textActive]}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateText, isSelected && styles.textActive]}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.slotsContainer}>
              <View style={styles.slotGrid}>
                {timeSlots.map((time, index) => {
                  const isActive = activeSlots.includes(time);
                  const existingSchedule = schedules.find((s: any) => new Date(s.date).toDateString() === selectedDate.toDateString());
                  const isBooked = existingSchedule?.availableSlots?.find((s: any) => s.time === time)?.isBooked;
                  return (
                    <Pressable
                      key={index}
                      style={[styles.slotBtn, isActive && styles.slotBtnActive, isBooked && styles.slotBtnBooked]}
                      onPress={() => !isBooked && toggleSlot(time)}
                      disabled={isBooked}
                    >
                      <Text style={[styles.slotText, isActive && styles.slotTextActive, isBooked && styles.slotTextBooked]}>
                        {time}
                      </Text>
                      {isBooked && <Ionicons name="lock-closed" size={12} color="#fff" style={{ marginLeft: 4 }} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving || loading}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Schedule</Text>}
            </Pressable>
          </View>
        </View>
      )}

      {/* ── PATIENTS TAB ── */}
      {activeTab === 'patients' && (
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.title}>My Patients</Text>
            <Text style={styles.subtitle}>All patients who have booked appointments with you</Text>
          </View>

          {patientsLoading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          ) : patients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color={Theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Patients Yet</Text>
              <Text style={styles.emptySubtitle}>Patients who book appointments with you will appear here</Text>
            </View>
          ) : (
            <FlatList
              data={patients}
              keyExtractor={(item: any) => item._id}
              contentContainerStyle={{ padding: 20, gap: 12 }}
              renderItem={({ item }) => {
                const status = item.status || 'booked';
                const colors = STATUS_COLORS[status] || STATUS_COLORS.booked;
                const apptDate = new Date(item.appointmentDate);
                return (
                  <View style={styles.patientCard}>
                    <View style={styles.patientAvatar}>
                      <Ionicons name="person" size={22} color={Theme.colors.primary} />
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{item.patient?.fullName || 'Unknown Patient'}</Text>
                      <View style={styles.patientMeta}>
                        <Ionicons name="calendar-outline" size={13} color={Theme.colors.textMuted} />
                        <Text style={styles.metaText}>
                          {apptDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                        <Ionicons name="time-outline" size={13} color={Theme.colors.textMuted} style={{ marginLeft: 8 }} />
                        <Text style={styles.metaText}>{item.startTime}</Text>
                      </View>
                      {item.symptoms ? (
                        <Text style={styles.symptoms} numberOfLines={1}>{item.symptoms}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </Text>
                      </View>
                      <Pressable style={styles.viewBtn} onPress={() => openPatientModal(item)}>
                        <Ionicons name="eye-outline" size={13} color="#fff" />
                        <Text style={styles.viewBtnText}>View</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ── PATIENT DETAIL MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalVisible(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>{selectedAppt?.patient?.fullName || 'Patient'}</Text>
            <Pressable
              style={styles.addRecordBtn}
              onPress={() => {
                if (showAddRecord) {
                  resetRecordForm();
                } else {
                  setShowAddRecord(true);
                }
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addRecordText}>{showAddRecord ? 'Close' : 'Add Record'}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {/* Patient Info */}
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Patient Information</Text>
              {[
                { icon: 'person-outline', label: 'Name', val: selectedAppt?.patient?.fullName },
                { icon: 'calendar-outline', label: 'Date of Birth', val: selectedAppt?.patient?.dateOfBirth ? new Date(selectedAppt.patient.dateOfBirth).toLocaleDateString() : '—' },
                { icon: 'pulse-outline', label: 'Age', val: selectedAppt?.patient?.age ? `${selectedAppt.patient.age} yrs` : '—' },
                { icon: 'male-female-outline', label: 'Gender', val: selectedAppt?.patient?.gender || '—' },
                { icon: 'call-outline', label: 'Phone', val: selectedAppt?.patient?.phone || '—' },
                { icon: 'location-outline', label: 'Address', val: selectedAppt?.patient?.address || '—' },
              ].map((row, i) => (
                <View key={i} style={styles.infoRow}>
                  <Ionicons name={row.icon as any} size={16} color={Theme.colors.primary} style={{ width: 22 }} />
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoVal}>{row.val}</Text>
                </View>
              ))}
            </View>

            {/* Add Record Form */}
            {showAddRecord && (
              <View style={styles.infoCard}>
                <Text style={styles.sectionLabel}>{editingRecordId ? 'Edit Medical Record' : 'New Medical Record'}</Text>
                <TextInput style={styles.mInput} placeholder="Diagnosis *" value={recordForm.diagnosis} onChangeText={v => setRecordForm({...recordForm, diagnosis: v})} />
                <TextInput style={[styles.mInput, { height: 80 }]} placeholder="Notes" value={recordForm.notes} onChangeText={v => setRecordForm({...recordForm, notes: v})} multiline />
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Prescription</Text>
                {recordForm.prescriptions.map((p, i) => (
                  <View key={i} style={{ gap: 8, marginBottom: 8 }}>
                    <TextInput style={styles.mInput} placeholder="Medication Name" value={p.medicationName} onChangeText={v => { const arr = [...recordForm.prescriptions]; arr[i].medicationName = v; setRecordForm({...recordForm, prescriptions: arr}); }} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput style={[styles.mInput, { flex: 1 }]} placeholder="Dosage" value={p.dosage} onChangeText={v => { const arr = [...recordForm.prescriptions]; arr[i].dosage = v; setRecordForm({...recordForm, prescriptions: arr}); }} />
                      <TextInput style={[styles.mInput, { flex: 1 }]} placeholder="Frequency" value={p.frequency} onChangeText={v => { const arr = [...recordForm.prescriptions]; arr[i].frequency = v; setRecordForm({...recordForm, prescriptions: arr}); }} />
                    </View>
                    <TextInput style={styles.mInput} placeholder="Duration (e.g. 7 days)" value={p.duration} onChangeText={v => { const arr = [...recordForm.prescriptions]; arr[i].duration = v; setRecordForm({...recordForm, prescriptions: arr}); }} />
                  </View>
                ))}
                <Pressable
                  style={styles.addPrescriptionBtn}
                  onPress={() => setRecordForm({
                    ...recordForm,
                    prescriptions: [...recordForm.prescriptions, { medicationName: '', dosage: '', frequency: '', duration: '' }]
                  })}
                >
                  <Ionicons name="add-circle-outline" size={16} color={Theme.colors.primary} />
                  <Text style={styles.addPrescriptionText}>Add Prescription</Text>
                </Pressable>
                <Pressable style={styles.saveRecordBtn} onPress={handleAddRecord} disabled={savingRecord}>
                  {savingRecord ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveRecordText}>{editingRecordId ? 'Update Record' : 'Save Record'}</Text>}
                </Pressable>
                {editingRecordId ? (
                  <Pressable style={styles.cancelEditBtn} onPress={resetRecordForm}>
                    <Text style={styles.cancelEditText}>Cancel Edit</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {/* Past Medical Records */}
            <Text style={styles.sectionLabel}>Past Medical Records</Text>
            {recordsLoading ? (
              <ActivityIndicator color={Theme.colors.primary} />
            ) : records.length === 0 ? (
              <Text style={{ color: Theme.colors.textMuted, textAlign: 'center', marginTop: 8 }}>No records found</Text>
            ) : (
              records.map((rec: any, i: number) => (
                <View key={i} style={styles.recordCard}>
                  <View style={styles.recordActions}>
                    <Pressable style={styles.recordActionBtn} onPress={() => handleEditRecord(rec)}>
                      <Ionicons name="create-outline" size={15} color={Theme.colors.primary} />
                      <Text style={styles.recordActionText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.recordActionBtn} onPress={() => handleDeleteRecord(rec._id)}>
                      <Ionicons name="trash-outline" size={15} color={Theme.colors.error} />
                      <Text style={[styles.recordActionText, { color: Theme.colors.error }]}>Delete</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.recDate}>{new Date(rec.date || rec.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  <Text style={styles.recDiagnosis}>{rec.diagnosis}</Text>
                  {rec.notes ? <Text style={styles.recNotes}>{rec.notes}</Text> : null}
                  {rec.prescriptions?.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.recPrescTitle}>Prescriptions:</Text>
                      {rec.prescriptions.map((p: any, j: number) => (
                        <Text key={j} style={styles.recPresc}>• {p.medicationName} — {p.dosage}, {p.frequency}, {p.duration}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: Theme.colors.text },
  subtitle: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 4 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Theme.colors.textMuted },
  tabTextActive: { color: Theme.colors.primary },
  badge: { backgroundColor: Theme.colors.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Schedule
  dateSelector: { height: 90, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingVertical: 10 },
  dateCard: { width: 60, height: 70, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: Theme.colors.border },
  dateCardActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  dayText: { fontSize: 13, color: Theme.colors.textMuted, fontWeight: '600' },
  dateText: { fontSize: 20, color: Theme.colors.text, fontWeight: '800', marginTop: 4 },
  textActive: { color: '#fff' },
  slotsContainer: { flex: 1, padding: 20 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slotBtn: { width: '31%', paddingVertical: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  slotBtnActive: { backgroundColor: Theme.colors.primary + '20', borderColor: Theme.colors.primary },
  slotBtnBooked: { backgroundColor: Theme.colors.error, borderColor: Theme.colors.error },
  slotText: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  slotTextActive: { color: Theme.colors.primary },
  slotTextBooked: { color: '#fff' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Theme.colors.border },
  saveBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Patients
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Theme.colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 8 },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  patientAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Theme.colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginRight: 14
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  patientMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  metaText: { fontSize: 12, color: Theme.colors.textMuted },
  symptoms: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 3 },
  viewBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, gap: 12 },
  backBtn: { padding: 4 },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Theme.colors.text },
  addRecordBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 4 },
  addRecordText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Theme.colors.border },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Theme.colors.border + '60' },
  infoLabel: { fontSize: 13, color: Theme.colors.textMuted, width: 90 },
  infoVal: { flex: 1, fontSize: 13, fontWeight: '600', color: Theme.colors.text },
  mInput: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Theme.colors.text, marginBottom: 4 },
  addPrescriptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Theme.colors.primary + '12', marginTop: 2 },
  addPrescriptionText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 12 },
  saveRecordBtn: { backgroundColor: Theme.colors.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveRecordText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelEditBtn: { alignItems: 'center', marginTop: 10, paddingVertical: 8 },
  cancelEditText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  recordCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Theme.colors.border, borderLeftWidth: 4, borderLeftColor: Theme.colors.primary },
  recordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginBottom: 2 },
  recordActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recordActionText: { color: Theme.colors.primary, fontSize: 12, fontWeight: '700' },
  recDate: { fontSize: 11, color: Theme.colors.textMuted, marginBottom: 4 },
  recDiagnosis: { fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  recNotes: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 4 },
  recPrescTitle: { fontSize: 12, fontWeight: '700', color: Theme.colors.text, marginBottom: 4 },
  recPresc: { fontSize: 12, color: Theme.colors.textMuted, marginBottom: 2 },
});
