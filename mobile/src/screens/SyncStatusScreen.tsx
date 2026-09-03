import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Badge, Button, Card, Divider, KeyValue, ListItem, Notice, Section } from '../components/ui';
import { useSync } from '../sync/SyncContext';
import { tables } from '../db';
import { useCount, useQuery } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { fmtDateTime, money, relativeTime } from '../utils/format';

function Line({ label, done, total }: { label: string; done: number; total: number }) {
  const ok = total === 0 || done >= total;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <Ionicons name={ok ? 'checkmark-circle' : 'time-outline'} size={18} color={ok ? colors.success : colors.warning} />
      <Text style={[type.body, { flex: 1, marginLeft: 10 }]}>{label}</Text>
      <Text style={type.small}>
        {String(done).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </Text>
    </View>
  );
}

export function SyncStatusScreen() {
  const { online, syncing, progress, lastSyncAt, lastError, pending, sync, lastOutcome } = useSync();
  const totalCollections = useCount(() => tables.collections().query(), []);
  const totalOrders = useCount(() => tables.orders().query(), []);
  const totalAttachments = useCount(() => tables.attachments().query(), []);
  const totalVisits = useCount(() => tables.visits().query(), []);
  const failed = useQuery(() => tables.collections().query(Q.where('status', 'FAILED'), Q.sortBy('collected_at', Q.desc)), []);
  const failedOrders = useQuery(() => tables.orders().query(Q.where('status', 'FAILED'), Q.sortBy('order_date', Q.desc)), []);
  const customers = useCount(() => tables.customers().query(), []);
  const products = useCount(() => tables.products().query(), []);
  const invoices = useCount(() => tables.invoices().query(), []);

  return (
    <Screen title={syncing ? 'Syncing…' : 'Sync Status'}>
      <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
        <Ionicons name={syncing ? 'cloud-upload-outline' : online ? 'cloud-done-outline' : 'cloud-offline-outline'} size={64} color={online ? colors.primary : colors.faint} />
        <Text style={[type.h3, { marginTop: spacing.sm }]}>{syncing ? (progress?.phase === 'attachments' ? 'Uploading photos' : progress?.phase === 'pull' ? 'Downloading updates' : 'Uploading data') : online ? 'Up to date with ERP' : 'Offline'}</Text>
        <Text style={type.small}>Last sync: {relativeTime(lastSyncAt)}</Text>
      </View>

      {lastError ? <Notice tone={online ? 'danger' : 'warning'} text={lastError} /> : null}

      <Card>
        <Line label="Collections" done={totalCollections - pending.collections} total={totalCollections} />
        <Divider />
        <Line label="Orders" done={totalOrders - pending.orders} total={totalOrders} />
        <Divider />
        <Line label="Visits" done={totalVisits - pending.visits} total={totalVisits} />
        <Divider />
        <Line label="Attachments" done={totalAttachments - pending.attachments} total={totalAttachments} />
      </Card>

      <Button title={syncing ? 'Syncing…' : 'Sync Now'} icon="refresh" onPress={() => void sync()} loading={syncing} disabled={!online} style={{ marginTop: spacing.lg }} />
      <Button title="Full refresh from server" variant="ghost" small onPress={() => void sync({ full: true })} disabled={!online || syncing} style={{ marginTop: spacing.xs }} />
      {syncing ? <Text style={[type.tiny, { textAlign: 'center', marginTop: spacing.sm }]}>Please keep the app open</Text> : null}

      {lastOutcome?.pushResults ? (
        <Section title="Last upload">
          <Card>
            <KeyValue label="Collections posted" value={String(lastOutcome.pushResults.collections.filter((c) => c.status === 'POSTED').length)} />
            <KeyValue label="Orders created" value={String(lastOutcome.pushResults.orders.filter((o) => o.status === 'CREATED').length)} />
            <KeyValue label="Failed" value={String(lastOutcome.pushResults.collections.filter((c) => c.status === 'FAILED').length + lastOutcome.pushResults.orders.filter((o) => o.status === 'FAILED').length)} valueStyle={{ color: colors.danger }} />
          </Card>
        </Section>
      ) : null}

      {failed.length + failedOrders.length > 0 ? (
        <Section title="Needs attention">
          <Card style={{ padding: 0 }}>
            {failed.map((c) => (
              <ListItem key={c.id} title={`Collection ${money(c.amount)} · ${c.paymentMode}`} subtitle={`${fmtDateTime(c.collectedAt)}\n${c.syncError ?? 'Rejected by ERP'}`} right={<Badge text="FAILED" tone="danger" />} />
            ))}
            {failedOrders.map((o) => (
              <ListItem key={o.id} title={`Order ${money(o.totalAmount)}`} subtitle={`${o.orderDate}\n${o.syncError ?? 'Rejected by ERP'}`} right={<Badge text="FAILED" tone="danger" />} />
            ))}
          </Card>
          <Text style={[type.tiny, { marginTop: 6 }]}>The office can fix and re-post these from the ERP (Mobile → Collections register).</Text>
        </Section>
      ) : null}

      <Section title="On this device">
        <Card>
          <KeyValue label="Customers" value={String(customers)} />
          <KeyValue label="Open invoices" value={String(invoices)} />
          <KeyValue label="Products" value={String(products)} />
        </Card>
      </Section>
    </Screen>
  );
}
