import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, Field, IconTile, ListItem, Pill } from '../components/ui';
import { Chips } from '../components/Chips';
import { Fab } from '../components/Fab';
import { PhotoBox } from '../components/PhotoBox';
import { useToast } from '../components/Toast';
import { tables } from '../db';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../db/models/Expense';
import { useQuery } from '../db/hooks';
import { spacing, type } from '../theme';
import { fmtDate, money, todayYmd } from '../utils/format';
import { monthStartYmd } from '../utils/period';
import type { CapturedPhoto } from '../utils/photos';
import type { RootStackParamList, ScreenProps } from '../navigation/types';
import { createExpense } from '../data/extras';
import { success } from '../utils/haptics';
import type { IconName } from '../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const ICON: Record<ExpenseCategory, IconName> = { Travel: 'bus-outline', Fuel: 'speedometer-outline', Food: 'restaurant-outline', Lodging: 'bed-outline', Phone: 'call-outline', Parking: 'car-outline', Other: 'receipt-outline' };

export function ExpensesScreen() {
  const nav = useNavigation<Nav>();
  const expenses = useQuery(() => tables.expenses().query(Q.sortBy('date', Q.desc), Q.sortBy('created_at', Q.desc)), []);
  const mtd = expenses.filter((e) => e.date >= monthStartYmd());
  const approved = mtd.filter((e) => e.status === 'APPROVED').reduce((s, e) => s + e.amount, 0);
  const pending = mtd.filter((e) => e.status === 'SUBMITTED').reduce((s, e) => s + e.amount, 0);

  return (
    <Screen title="Expense claims" back refreshable overlay={<Fab icon="add" label="New claim" onPress={() => nav.navigate('ExpenseNew')} />}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <Text style={type.small}>This month</Text>
          <Text style={type.money}>{money(mtd.reduce((s, e) => s + e.amount, 0))}</Text>
          <Text style={type.tiny}>{mtd.length} claims</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={type.small}>Approved / pending</Text>
          <Text style={[type.h3, { fontSize: 18, marginTop: 4 }]}>{money(approved)}</Text>
          <Text style={type.tiny}>{money(pending)} awaiting office</Text>
        </Card>
      </View>
      <View style={{ height: spacing.lg }} />
      {expenses.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No expense claims yet" hint="Add travel, fuel or food expenses with a photo of the bill. The office approves them into the ERP." />
      ) : (
        <Card style={{ padding: 0 }}>
          {expenses.map((e) => (
            <ListItem
              key={e.id}
              leading={<IconTile icon={ICON[e.category] ?? 'receipt-outline'} tone={e.status === 'APPROVED' ? 'success' : e.status === 'REJECTED' ? 'danger' : 'warning'} size={40} />}
              title={`${e.category} · ${money(e.amount)}`}
              subtitle={`${fmtDate(e.date)} · ${e.description}${e.expenseNumber ? ` · ${e.expenseNumber}` : ''}${e.reviewNote ? `\n${e.reviewNote}` : ''}`}
              right={<Pill text={e.status === 'APPROVED' ? 'Approved' : e.status === 'REJECTED' ? 'Rejected' : 'Submitted'} tone={e.status === 'APPROVED' ? 'success' : e.status === 'REJECTED' ? 'danger' : 'warning'} />}
            />
          ))}
        </Card>
      )}
      <View style={{ height: 80 }} />
    </Screen>
  );
}

export function ExpenseNewScreen({ navigation }: ScreenProps<'ExpenseNew'>) {
  const toast = useToast();
  const [category, setCategory] = useState<ExpenseCategory>('Travel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayYmd());
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return Alert.alert('Amount', 'Enter the amount spent.');
    if (!description.trim()) return Alert.alert('Description', 'Describe the expense, e.g. "Bus fare Tambaram–Mylapore".');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Date', 'Enter the date as YYYY-MM-DD.');
    setBusy(true);
    try {
      await createExpense({ date, category, description, amount: amt, notes, photos: photo ? [{ kind: 'OTHER', photo }] : [] });
      void success();
      toast.show('Expense claim submitted');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title="New expense claim" back footer={<Button title="Submit claim" onPress={save} loading={busy} />}>
      <Text style={[type.label, { marginBottom: spacing.sm }]}>Category</Text>
      <Chips value={category} onChange={setCategory} scroll={false} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c, icon: ICON[c] }))} />
      <Field label="Amount" keyboardType="decimal-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} style={{ marginTop: spacing.xl }} />
      <Field label="What was it for?" value={description} onChangeText={setDescription} placeholder="e.g. Petrol, 2 litres" />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
      <Text style={[type.h3, { marginBottom: spacing.sm }]}>Bill / receipt photo</Text>
      <PhotoBox label="" name={`expense-${Date.now()}`} photo={photo} onChange={setPhoto} hint="Claims with a bill photo are approved faster" />
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
