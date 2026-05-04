import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { api } from '../../services/api';
import { Theme } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function NewAppointmentScreen() {
  const params = useLocalSearchParams<{
    doctorId: string;
    doctorName: string;
    doctorFee?: string;
    appointmentId?: string;
    mode?: string;
    appointmentDate?: string;
    currentSlot?: string;
  }>();
  const consultationFee = Number(params.doctorFee || 0);
  const isReschedule = params.mode === 'reschedule' && Boolean(params.appointmentId);
  const SLOT_CAPACITY = 4;

  // Form State
  const [selectedDate, setSelectedDate] = useState(() => {
    if (params.appointmentDate) {
      const d = new Date(String(params.appointmentDate));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const [selectedSlot, setSelectedSlot] = useState(() =>
    params.currentSlot ? String(params.currentSlot) : ''
  );
  const [symptoms, setSymptoms] = useState('');
  
  // Data State
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  // Generate next 7 days for the picker
  const next7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchSlots = async (date: Date) => {
    try {
      setLoadingSlots(true);
      setSelectedSlot('');
      const response = await api.get(`/schedules/slots?doctorId=${params.doctorId}&date=${date.toISOString()}`);
      const rawSlots = response.data.data || [];
      if (rawSlots.length > 0 && typeof rawSlots[0] === 'string') {
        setAvailableSlots(rawSlots.map((time: string) => ({ time, bookedCount: 0, capacity: SLOT_CAPACITY, isFull: false, isBlocked: false })));
      } else {
        setAvailableSlots(rawSlots);
      }
    } catch (error) {
      console.error('Fetch slots error:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (params.doctorId) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, params.doctorId]);

  const submit = async () => {
    if (!params.doctorId || !selectedSlot) {
      Alert.alert('Validation', 'Please select a time slot');
      return;
    }

    const confirmTitle = isReschedule ? 'Confirm reschedule' : 'Confirm Appointment';
    const confirmMessage = `Doctor: Dr. ${params.doctorName}\nDate: ${selectedDate.toLocaleDateString()}\nTime: ${selectedSlot}\nConsultation Fee: LKR ${consultationFee.toLocaleString()}\n\n${isReschedule ? 'Update your booking to this slot?' : 'Do you want to confirm this booking?'}`;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(confirmTitle, confirmMessage, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', onPress: () => resolve(true) }
      ]);
    });

    if (!confirmed) return;

    try {
      setBooking(true);

      const startTime = selectedSlot;
      const isPM = startTime.includes('PM');
      let [hourStr, minStr] = startTime.split(':');
      let hour = parseInt(hourStr, 10);
      let min = parseInt(minStr.split(' ')[0], 10);

      min += 30;
      if (min >= 60) {
        min -= 60;
        hour += 1;
        if (hour > 12) hour -= 12;
      }
      const endTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

      if (isReschedule && params.appointmentId) {
        await api.patch(`/appointments/my/${params.appointmentId}`, {
          appointmentDate: selectedDate.toISOString(),
          startTime,
          endTime
        });
        Alert.alert('Success', 'Appointment rescheduled');
      } else {
        await api.post('/appointments', {
          doctor: params.doctorId,
          appointmentDate: selectedDate.toISOString(),
          startTime,
          endTime,
          type: 'online',
          symptoms
        });

        try {
          await api.post('/schedules/my', {
            date: selectedDate.toISOString(),
            availableSlots: availableSlots.map((s) => ({ time: s, isBooked: s === selectedSlot }))
          });
        } catch (e) {}

        Alert.alert('Success', 'Appointment booked');
      }

      router.replace('/(tabs)/appointments');
    } catch (error: any) {
      Alert.alert('Booking failed', error?.response?.data?.message || 'Try another slot');
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{isReschedule ? 'Reschedule' : 'Book Consultation'}</Text>
          <Text style={styles.subtitle}>Dr. {params.doctorName}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Select Date</Text>
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

        <Text style={styles.sectionTitle}>Available Slots</Text>
        {loadingSlots ? (
          <ActivityIndicator color={Theme.colors.primary} style={{ marginTop: 20 }} />
        ) : availableSlots.length === 0 ? (
          <View style={styles.noSlotsBox}>
            <Ionicons name="calendar-clear-outline" size={32} color={Theme.colors.textMuted} />
            <Text style={styles.noSlotsText}>No availability for this date.</Text>
            <Text style={styles.noSlotsSub}>Please select another day.</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {availableSlots.map((slot, index) => {
              const isSelected = selectedSlot === slot.time;
              const isBlocked = slot.isBlocked;
              const isFull = slot.isFull;
              return (
                <Pressable 
                  key={index} 
                  style={[styles.slotBtn, isSelected && styles.slotBtnActive, isBlocked && styles.slotBtnBlocked]}
                  onPress={() => !isBlocked && setSelectedSlot(slot.time)}
                  disabled={isBlocked}
                >
                  <Text style={[styles.slotText, isSelected && styles.slotTextActive, isBlocked && styles.slotTextBlocked]}>
                    {slot.time}
                  </Text>
                  <Text style={[styles.slotSubText, isBlocked && styles.slotSubTextBlocked]}>
                    {isFull ? 'Full (4/4)' : `${slot.bookedCount || 0}/${slot.capacity || SLOT_CAPACITY}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!isReschedule && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Symptoms (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Briefly describe your symptoms..."
              multiline
              numberOfLines={3}
              value={symptoms}
              onChangeText={setSymptoms}
            />
          </>
        )}

        <View style={styles.feeCard}>
          <View style={styles.feeIconWrap}>
            <Ionicons name="cash-outline" size={18} color={Theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeValue}>LKR {consultationFee.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.button, (!selectedSlot || booking) && styles.buttonDisabled]} 
          onPress={submit}
          disabled={!selectedSlot || booking}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isReschedule ? 'Confirm reschedule' : 'Confirm Booking'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  backBtn: { padding: 8, marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
  subtitle: { fontSize: 14, color: Theme.colors.primary, fontWeight: '600' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  
  dateSelector: { height: 90 },
  dateCard: { width: 60, height: 70, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: Theme.colors.border },
  dateCardActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  dayText: { fontSize: 13, color: Theme.colors.textMuted, fontWeight: '600' },
  dateText: { fontSize: 20, color: Theme.colors.text, fontWeight: '800', marginTop: 4 },
  textActive: { color: '#fff' },
  
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  slotBtn: { width: '30%', paddingVertical: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  slotBtnActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  slotBtnBlocked: { backgroundColor: Theme.colors.error + '15', borderColor: Theme.colors.error },
  slotText: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  slotTextActive: { color: '#fff' },
  slotTextBlocked: { color: Theme.colors.error },
  slotSubText: { fontSize: 10, marginTop: 2, color: Theme.colors.textMuted, fontWeight: '600' },
  slotSubTextBlocked: { color: Theme.colors.error },
  
  noSlotsBox: { marginHorizontal: 20, padding: 24, backgroundColor: Theme.colors.surface, borderRadius: 16, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: Theme.colors.border },
  noSlotsText: { fontSize: 15, fontWeight: '600', color: Theme.colors.text, marginTop: 12 },
  noSlotsSub: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 4 },
  
  input: { marginHorizontal: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, padding: 16, fontSize: 15, textAlignVertical: 'top' },
  feeCard: { marginHorizontal: 20, marginTop: 18, marginBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  feeIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: Theme.colors.primary + '14', justifyContent: 'center', alignItems: 'center' },
  feeLabel: { fontSize: 12, color: Theme.colors.textMuted, fontWeight: '600' },
  feeValue: { fontSize: 17, color: Theme.colors.text, fontWeight: '800', marginTop: 2 },
  
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Theme.colors.border },
  button: { backgroundColor: Theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
