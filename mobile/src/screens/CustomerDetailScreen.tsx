import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Badge, Button, Card, Divider, EmptyState, IconTile, KeyValue, ListItem, Money, Notice, Pill, Section, type IconName } from '../components/ui';
import { Segmented } from '../components/Chips';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { tables } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { colors, radius, shadow, spacing, type } from '../theme';
import { daysBetween, fmtDate, fmtDateTime, money, todayYmd } from '../utils/format';
import { creditStatus } from '../utils/credit';
import type { CustomerTab, ScreenProps } from '../navigation/types';
import { completeVisit, startVisit } from '../data/actions';
import { completeFollowUp } from '../data/extras';
import { openMaps } from './RoutePlanScreen';
import { useAuth } from '../auth/AuthContext';
import { useSync } from '../sync/SyncContext';
import { tap, success as hapticSuccess } from '../utils/haptics';

const ORDER_STATUS_TONE = (s: string): 'info' | 'success' | 'warning' | 'danger' | 'muted' => {
  if (['DISPATCHED', 'INVOICED', 'COMPLETED'].includes(s)) return 'success';
  if (['CANCELLED', 'CUSTOMER_REJECTED', 'FAILED'].includes(s)) return 'danger';
  if (['DRAFT', 'PENDING', 'PENDING_CUSTOMER_APPROVAL'].includes(s)) return 'warning';
  if (['CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'PARTIALLY_DISPATCHED'].includes(s)) return 'info';
  return 'muted';
};
const prettyStatus = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function CustomerDetailScreen({ route, navigation }: ScreenProps<'CustomerDetail'>) {
  const { customerId, visitId } = route.params;
  const [tab, setTab] = useState<CustomerTab>(route.params.tab ?? 'overview');
  const toast = useToast();
  const { isDemo } = useAuth();
  const { online } = useSync();
  const customer = useRecord(() => tables.customers().findAndObserve(customerId), [customerId]);
  const visit = useRecord(() => (visitId ? tables.visits().findAndObserve(visitId) : null), [visitId]);
  const invoices = useQuery(() => tables.invoices().query(Q.where('customer_id', customerId), Q.sortBy('invoice_date', Q.asc)), [customerId]);
  const collections = useQuery(() => tables.collections().query(Q.where('customer_id', customerId), Q.sortBy('collected_at', Q.desc)), [customerId]);
  const followUps = useQuery(() => tables.followUps().query(Q.where('customer_id', customerId), Q.sortBy('due_at', Q.desc)), [customerId]);
  const history = useQuery(() => tables.orderHistory().query(Q.where('customer_id', customerId), Q.sortBy('order_date', Q.desc)), [customerId]);
  const deviceOrders = useQuery(() => tables.orders().query(Q.where('customer_id', customerId), Q.sortBy('order_date', Q.desc)), [customerId]);

  const open = invoices.filter((i) => i.balance > 0);
  const credit = useMemo(
    () => (customer ? creditStatus({ creditLimit: customer.creditLimit, status: customer.status, invoices: open.map((i) => ({ balance: i.balance, dueDate: i.dueDate, invoiceDate: i.invoiceDate })) }) : null),
    [customer, open]
  );
  const openFollowUps = followUps.filter((f) => f.status === 'OPEN');
  const last = collections[0];
  const lastOrder = history[0];

  if (!customer) {
    return (
      <Screen title="Customer" back>
        <EmptyState title="Customer not found on this device" hint="Run a sync to refresh the customer master." />
      </Screen>
    );
  }

  const canVisit = !!visit && visit.status !== 'COMPLETED' && visit.status !== 'SKIPPED';
  const onComplete = () => {
    if (!visit) return;
    if (!visit.outcome || visit.outcome === 'NO_ACTION') {
      Alert.alert('Nothing collected', 'Log why nothing was collected (promise to pay, callback, dispute) so the office can follow up?', [
        { text: 'Log follow-up', onPress: () => navigation.navigate('FollowUpLog', { customerId, visitId }) },
        { text: 'Complete anyway', style: 'destructive', onPress: () => void completeVisit(visit) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    void completeVisit(visit).then(() => {
      void hapticSuccess();
      toast.show('Visit completed');
    });
  };

  const sendInvoice = (invoiceNo: string) => {
    if (isDemo) {
      toast.show(`Invoice ${invoiceNo} sent on WhatsApp (demo)`, 'info');
      return;
    }
    if (!online) {
      toast.show('Sending the invoice PDF needs a connection', 'warning');
      return;
    }
    toast.show('Invoice sharing is enabled once the app is connected to the ERP', 'info');
  };

  const headlineTone = credit?.headline === 'Good standing' ? 'success' : credit?.headline === 'Overdue' ? 'warning' : credit?.headline === 'Lead' ? 'accent' : 'danger';

  return (
    <Screen
      title={customer.name}
      subtitle={customer.customerCode}
      back
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button title="Collect" icon="cash-outline" variant="success" style={{ flex: 1 }} onPress={() => navigation.navigate('CollectionEntry', { customerId, visitId })} />
          <Button title="New Order" icon="cart-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('NewOrder', { customerId, visitId })} disabled={credit?.blocked} />
        </View>
      }
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Avatar name={customer.name} size={52} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={type.h2}>{customer.name}</Text>
          <Text style={type.small}>{customer.fullAddress || '—'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {customer.gradeName ? <Pill text={customer.gradeName} tone="muted" /> : null}
            {customer.typeName ? <Pill text={customer.typeName} tone="muted" /> : null}
            {credit ? <Pill text={credit.headline} tone={headlineTone} /> : null}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <ContactAction icon="call-outline" label="Call" disabled={!customer.mobile} onPress={() => Linking.openURL(`tel:${customer.mobile}`)} />
        <ContactAction icon="logo-whatsapp" label="WhatsApp" disabled={!customer.mobile} onPress={() => Linking.openURL(`https://wa.me/${customer.mobile?.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`)} />
        <ContactAction icon="navigate-outline" label="Navigate" onPress={() => openMaps(customer)} />
        <ContactAction icon="alarm-outline" label="Follow-up" onPress={() => navigation.navigate('FollowUpLog', { customerId, visitId })} />
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'invoices', label: `Invoices${open.length ? ` (${open.length})` : ''}` },
            { value: 'orders', label: 'Orders' },
            { value: 'activity', label: 'Activity' },
          ]}
        />
      </View>

      {tab === 'overview' ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
            <Card style={[{ flex: 1 }, shadow.card]}>
              <Text style={type.small}>Outstanding</Text>
              <Money value={customer.outstanding} style={{ fontSize: 22, marginTop: 4 }} />
              {credit?.hasOverdue ? <Text style={[type.tiny, { color: colors.danger, fontWeight: '700' }]}>{money(credit.overdueAmount)} overdue</Text> : <Text style={type.tiny}>{open.length} open invoice{open.length === 1 ? '' : 's'}</Text>}
            </Card>
            <Card style={[{ flex: 1 }, shadow.card]}>
              <Text style={type.small}>Last collection</Text>
              <Text style={[type.h3, { fontSize: 22, marginTop: 4 }]}>{last ? money(last.amount) : '—'}</Text>
              <Text style={type.tiny}>{last ? `${fmtDate(last.collectedAt)} · ${last.paymentMode}` : 'No collections yet'}</Text>
            </Card>
          </View>

          {/* Credit status */}
          {credit ? (
            <Card style={{ marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={type.label}>Credit status</Text>
                <Pill text={credit.headline} tone={headlineTone} />
              </View>
              {customer.creditLimit > 0 ? (
                <>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, marginTop: spacing.md, overflow: 'hidden' }}>
                    <View style={{ height: 8, width: `${Math.min(100, Math.round(credit.utilisation * 100))}%`, backgroundColor: credit.utilisation > 1 ? colors.danger : credit.utilisation > 0.8 ? colors.warning : colors.success }} />
                  </View>
                  <Text style={[type.tiny, { marginTop: 6 }]}>
                    {money(credit.exposure)} of {money(customer.creditLimit)} limit used{customer.creditDays ? ` · ${customer.creditDays} days credit` : ''}
                  </Text>
                </>
              ) : (
                <Text style={[type.tiny, { marginTop: 6 }]}>No credit limit set{customer.creditDays ? ` · ${customer.creditDays} days credit` : ''}</Text>
              )}
              {credit.hasOverdue ? <Text style={[type.small, { color: colors.danger, marginTop: 6 }]}>Oldest overdue invoice is {credit.oldestOverdueDays} days past due. New orders will need office approval.</Text> : null}
              {credit.blocked ? <Text style={[type.small, { color: colors.danger, marginTop: 6 }]}>Customer is blocked in the ERP — collections only.</Text> : null}
            </Card>
          ) : null}

          {/* Visit */}
          {visit ? (
            <Card style={{ marginTop: spacing.md }}>
              <KeyValue label="Visit" value={<Badge text={visit.status.replace('_', ' ')} tone={visit.status === 'COMPLETED' ? 'success' : visit.status === 'IN_PROGRESS' ? 'info' : 'muted'} />} />
              {visit.checkInAt ? <KeyValue label="Checked in" value={fmtDateTime(visit.checkInAt)} /> : null}
              {canVisit ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  {visit.status === 'PLANNED' ? <Button small title="Check in" icon="location-outline" onPress={() => void startVisit(visit).then(() => toast.show('Checked in'))} style={{ flex: 1 }} /> : null}
                  <Button small title="Complete visit" icon="checkmark-done-outline" variant="success" onPress={onComplete} style={{ flex: 1 }} />
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* Open follow-ups */}
          {openFollowUps.length ? (
            <Section title="Open follow-ups">
              <Card style={{ padding: 0 }}>
                {openFollowUps.map((f) => (
                  <ListItem
                    key={f.id}
                    leading={<IconTile icon={f.type === 'PTP' ? 'cash-outline' : f.type === 'DISPUTE' ? 'alert-circle-outline' : 'call-outline'} tone={f.isOverdue ? 'danger' : 'warning'} size={38} />}
                    title={f.type === 'PTP' ? `Promised ${money(f.promisedAmount ?? 0)} on ${fmtDate(f.promisedDate)}` : f.type === 'DISPUTE' ? 'Dispute raised' : `Call back ${fmtDate(f.dueAt)}`}
                    subtitle={f.notes || f.reason?.replace(/_/g, ' ').toLowerCase()}
                    right={
                      <Pressable onPress={() => void completeFollowUp(f).then(() => toast.show('Follow-up closed'))} hitSlop={8} style={{ minHeight: 40, justifyContent: 'center' }}>
                        <Text style={[type.small, { color: colors.primary, fontWeight: '700' }]}>Done</Text>
                      </Pressable>
                    }
                  />
                ))}
              </Card>
            </Section>
          ) : null}

          <Section title="Quick actions">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <QuickAction icon="flash-outline" label="Collect full outstanding" disabled={open.length === 0} onPress={() => navigation.navigate('CollectionEntry', { customerId, visitId, selectAll: true })} />
              <QuickAction icon="repeat-outline" label="Repeat last order" disabled={!lastOrder} onPress={() => lastOrder && navigation.navigate('NewOrder', { customerId, visitId, prefill: lastOrder.items })} />
              <QuickAction icon="bar-chart-outline" label="Ageing view" onPress={() => navigation.navigate('Outstanding', { customerId })} />
              <QuickAction icon="alarm-outline" label="Log promise / callback" onPress={() => navigation.navigate('FollowUpLog', { customerId, visitId })} />
            </View>
          </Section>

          <Section title="Details">
            <Card>
              <KeyValue label="Mobile" value={customer.mobile ?? '—'} />
              <Divider />
              <KeyValue label="GSTIN" value={customer.gstin ?? '—'} />
              <Divider />
              <KeyValue label="Credit" value={`${money(customer.creditLimit)}${customer.creditDays ? ` · ${customer.creditDays} days` : ''}`} />
              <Divider />
              <KeyValue label="Status" value={customer.status} />
            </Card>
          </Section>
        </>
      ) : null}

      {tab === 'invoices' ? (
        <Section title={`Open invoices · ${money(open.reduce((s, i) => s + i.balance, 0))}`}>
          <Card style={{ padding: 0 }}>
            {open.length === 0 ? (
              <EmptyState icon="checkmark-circle-outline" title="No open invoices" />
            ) : (
              open.map((inv, idx) => {
                const due = inv.dueDate || inv.invoiceDate;
                const overdueDays = due < todayYmd() ? daysBetween(due) : 0;
                return (
                  <View key={inv.id}>
                    <View style={{ padding: spacing.md }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={type.h3}>{inv.invoiceNo}</Text>
                        <Money value={inv.balance} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <Text style={type.tiny}>
                          Invoiced {fmtDate(inv.invoiceDate)} · Due {fmtDate(due)}
                        </Text>
                        {overdueDays > 0 ? <Pill text={`${overdueDays}d overdue`} tone="danger" /> : <Pill text="Within terms" tone="success" />}
                        {inv.status === 'PARTIAL' ? <Pill text={`Paid ${money(inv.paidAmount)}`} tone="info" /> : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                        <Button small variant="outline" icon="logo-whatsapp" title="Send invoice" onPress={() => sendInvoice(inv.invoiceNo)} />
                        <Button small variant="outline" icon="cash-outline" title="Collect this" onPress={() => navigation.navigate('CollectionEntry', { customerId, visitId })} />
                      </View>
                    </View>
                    {idx < open.length - 1 ? <Divider /> : null}
                  </View>
                );
              })
            )}
          </Card>
          {invoices.length > open.length ? <Text style={[type.tiny, { marginTop: spacing.sm }]}>{invoices.length - open.length} settled invoice{invoices.length - open.length === 1 ? '' : 's'} in the last 6 months.</Text> : null}
        </Section>
      ) : null}

      {tab === 'orders' ? (
        <>
          {deviceOrders.length ? (
            <Section title="Booked from this device">
              <Card style={{ padding: 0 }}>
                {deviceOrders.map((o) => (
                  <ListItem key={o.id} title={`${o.orderNo ?? 'Pending number'} · ${money(o.totalAmount)}`} subtitle={`${fmtDate(o.orderDate)} · ${o.items.length} items`} right={<Badge text={o.status === 'PENDING' ? 'Syncing' : prettyStatus(o.status)} tone={o.status === 'PENDING' ? 'info' : ORDER_STATUS_TONE(o.status)} />} />
                ))}
              </Card>
            </Section>
          ) : null}
          <Section title="Order history (ERP)">
            {history.length === 0 ? (
              <Card>
                <Text style={type.small}>No past orders for this customer.</Text>
              </Card>
            ) : (
              history.map((o) => (
                <Card key={o.id} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={type.h3}>{o.orderNo}</Text>
                    <Badge text={prettyStatus(o.status)} tone={ORDER_STATUS_TONE(o.status)} />
                  </View>
                  <Text style={type.tiny}>
                    {fmtDate(o.orderDate)} · {money(o.netAmount)}
                  </Text>
                  <Text style={[type.small, { marginTop: 6 }]} numberOfLines={2}>
                    {o.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
                  </Text>
                  <Button small variant="outline" icon="repeat-outline" title="Repeat this order" style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} onPress={() => navigation.navigate('NewOrder', { customerId, visitId, prefill: o.items })} />
                </Card>
              ))
            )}
          </Section>
        </>
      ) : null}

      {tab === 'activity' ? (
        <Section title="Activity">
          <Timeline
            items={[
              ...collections.map((c) => ({ id: c.id, at: c.collectedAt, icon: 'cash-outline' as IconName, tone: 'success' as const, title: `${money(c.amount)} collected · ${c.paymentMode}`, sub: `${c.receiptNo ?? 'Pending receipt no.'}${c.referenceNo ? ` · Ref ${c.referenceNo}` : ''}` })),
              ...followUps.map((f) => ({
                id: f.id,
                at: f.createdAt,
                icon: (f.type === 'PTP' ? 'alarm-outline' : f.type === 'DISPUTE' ? 'alert-circle-outline' : 'call-outline') as IconName,
                tone: (f.status === 'BROKEN' ? 'danger' : f.status === 'DONE' ? 'success' : 'warning') as 'danger' | 'success' | 'warning',
                title: f.type === 'PTP' ? `Promise to pay ${money(f.promisedAmount ?? 0)} by ${fmtDate(f.promisedDate)} · ${f.status.toLowerCase()}` : `${f.type === 'DISPUTE' ? 'Dispute' : f.type === 'CALLBACK' ? 'Callback' : 'No action'} · ${f.status.toLowerCase()}`,
                sub: f.notes || f.reason?.replace(/_/g, ' ').toLowerCase() || '',
              })),
              ...deviceOrders.map((o) => ({ id: o.id, at: o.updatedAt, icon: 'cart-outline' as IconName, tone: 'info' as const, title: `Order ${o.orderNo ?? ''} ${money(o.totalAmount)}`.trim(), sub: `${o.items.length} items · ${prettyStatus(o.status)}` })),
            ].sort((a, b) => b.at - a.at)}
          />
        </Section>
      ) : null}
      {isDemo ? <Notice tone="info" text="Demo data — figures are illustrative." /> : null}
    </Screen>
  );
}

function ContactAction({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        void tap();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, borderRadius: radius.md, backgroundColor: pressed ? colors.primarySoft : colors.card, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.45 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={[type.tiny, { color: colors.text, fontWeight: '600', marginTop: 4 }]}>{label}</Text>
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: pressed ? colors.primarySoft : colors.card, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.45 : 1 }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[type.small, { color: colors.text, fontWeight: '600', flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

function Timeline({ items }: { items: { id: string; at: number; icon: IconName; tone: 'success' | 'warning' | 'danger' | 'info'; title: string; sub: string }[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <Text style={type.small}>No activity recorded yet.</Text>
      </Card>
    );
  }
  return (
    <Card style={{ padding: 0 }}>
      {items.map((it, idx) => (
        <View key={it.id} style={{ flexDirection: 'row', padding: spacing.md, borderBottomWidth: idx < items.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
          <IconTile icon={it.icon} tone={it.tone} size={36} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={type.h3}>{it.title}</Text>
            {it.sub ? <Text style={type.small}>{it.sub}</Text> : null}
            <Text style={type.tiny}>{fmtDateTime(it.at)}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}
