import React from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Badge, Button, Card, Divider, EmptyState, KeyValue, ListItem, Money, Section } from '../components/ui';
import { tables } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { fmtDate, fmtDateTime, money } from '../utils/format';
import type { ScreenProps } from '../navigation/types';
import { completeVisit, startVisit } from '../data/actions';
import { openMaps } from './RoutePlanScreen';

export function CustomerDetailScreen({ route, navigation }: ScreenProps<'CustomerDetail'>) {
  const { customerId, visitId } = route.params;
  const customer = useRecord(() => tables.customers().findAndObserve(customerId), [customerId]);
  const visit = useRecord(() => (visitId ? tables.visits().findAndObserve(visitId) : null), [visitId]);
  const invoices = useQuery(() => tables.invoices().query(Q.where('customer_id', customerId), Q.where('balance', Q.gt(0)), Q.sortBy('invoice_date', Q.asc)), [customerId]);
  const lastCollections = useQuery(() => tables.collections().query(Q.where('customer_id', customerId), Q.sortBy('collected_at', Q.desc), Q.take(1)), [customerId]);
  const last = lastCollections[0];

  if (!customer) {
    return (
      <Screen title="Customer Details" back>
        <EmptyState title="Customer not found on this device" hint="Run a sync to refresh the customer master." />
      </Screen>
    );
  }

  const openInvoicesTotal = invoices.reduce((s, i) => s + i.balance, 0);
  const canVisit = !!visit && visit.status !== 'COMPLETED' && visit.status !== 'SKIPPED';

  const onCheckIn = () => {
    if (!visit) return;
    void startVisit(visit);
  };
  const onComplete = () => {
    if (!visit) return;
    Alert.alert('Complete visit', `Mark the visit to ${customer.name} as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => void completeVisit(visit) },
    ]);
  };

  return (
    <Screen
      title="Customer Details"
      back
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button title="Collection" icon="cash-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('CollectionEntry', { customerId, visitId })} />
          <Button title="New Order" icon="cart-outline" variant="outline" style={{ flex: 1 }} onPress={() => navigation.navigate('NewOrder', { customerId, visitId })} disabled={customer.status === 'Blocked'} />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={type.h2}>{customer.name}</Text>
          <Text style={type.small}>{customer.fullAddress || '—'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={type.tiny}>Code: {customer.customerCode}</Text>
            {customer.gradeName ? <Badge text={customer.gradeName} tone="muted" /> : null}
            {customer.status !== 'Active' ? <Badge text={customer.status} tone={customer.status === 'Blocked' ? 'danger' : 'warning'} /> : null}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        {customer.mobile ? <Button small variant="outline" icon="call-outline" title="Call" onPress={() => Linking.openURL(`tel:${customer.mobile}`)} /> : null}
        {customer.mobile ? <Button small variant="outline" icon="logo-whatsapp" title="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${customer.mobile?.replace(/\D/g, '')}`)} /> : null}
        <Button small variant="outline" icon="navigate-outline" title="Navigate" onPress={() => openMaps(customer)} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
        <Card style={{ flex: 1 }}>
          <Text style={type.small}>Outstanding</Text>
          <Money value={customer.outstanding} style={{ fontSize: 20, marginTop: 4 }} />
          {customer.creditLimit > 0 ? <Text style={type.tiny}>Limit {money(customer.creditLimit)}</Text> : null}
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={type.small}>Last Collection</Text>
          <Text style={[type.h3, { fontSize: 20, marginTop: 4 }]}>{last ? money(last.amount) : '—'}</Text>
          <Text style={type.tiny}>{last ? fmtDate(last.collectedAt) : 'No collections yet'}</Text>
        </Card>
      </View>

      {visit ? (
        <Card style={{ marginTop: spacing.md }}>
          <KeyValue label="Visit" value={<Badge text={visit.status.replace('_', ' ')} tone={visit.status === 'COMPLETED' ? 'success' : visit.status === 'IN_PROGRESS' ? 'info' : 'muted'} />} />
          {visit.checkInAt ? <KeyValue label="Checked in" value={fmtDateTime(visit.checkInAt)} /> : null}
          {canVisit ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              {visit.status === 'PLANNED' ? <Button small title="Check in" icon="location-outline" onPress={onCheckIn} style={{ flex: 1 }} /> : null}
              <Button small title="Complete visit" icon="checkmark-done-outline" variant="success" onPress={onComplete} style={{ flex: 1 }} />
            </View>
          ) : null}
        </Card>
      ) : null}

      <Section
        title={`Open Invoices (${invoices.length})`}
        right={
          <Pressable onPress={() => navigation.navigate('Outstanding', { customerId })}>
            <Text style={[type.small, { color: colors.primary, fontWeight: '600' }]}>Ageing view</Text>
          </Pressable>
        }
      >
        <Card style={{ padding: 0 }}>
          {invoices.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="No open invoices" />
          ) : (
            invoices.map((inv, idx) => (
              <View key={inv.id}>
                <ListItem
                  title={inv.invoiceNo}
                  subtitle={`Due: ${fmtDate(inv.dueDate || inv.invoiceDate)}${inv.status === 'PARTIAL' ? ` · paid ${money(inv.paidAmount)}` : ''}`}
                  right={<Money value={inv.balance} />}
                />
                {idx < invoices.length - 1 ? null : <Divider />}
              </View>
            ))
          )}
          {invoices.length > 0 ? (
            <View style={{ padding: spacing.md }}>
              <KeyValue label="Total open" value={money(openInvoicesTotal)} />
            </View>
          ) : null}
        </Card>
      </Section>
    </Screen>
  );
}
