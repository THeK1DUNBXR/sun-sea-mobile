import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Button, Card, Divider, KeyValue, ListItem, Money, Notice, Section } from '../components/ui';
import { tables } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { spacing, type } from '../theme';
import { agingBuckets } from '../utils/aging';
import { fmtDate, money } from '../utils/format';
import type { ScreenProps } from '../navigation/types';
import { mobileApi } from '../api/mobileApi';
import type { CustomerStatement } from '../api/types';
import { useSync } from '../sync/SyncContext';

export function OutstandingScreen({ route }: ScreenProps<'Outstanding'>) {
  const { customerId } = route.params;
  const { online } = useSync();
  const customer = useRecord(() => tables.customers().findAndObserve(customerId), [customerId]);
  const invoices = useQuery(() => tables.invoices().query(Q.where('customer_id', customerId), Q.sortBy('invoice_date', Q.asc)), [customerId]);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);

  const open = invoices.filter((i) => i.balance > 0);
  const aging = agingBuckets(open.map((i) => ({ invoiceDate: i.invoiceDate, balance: i.balance })));

  useEffect(() => {
    if (!online) return;
    setLoading(true);
    mobileApi
      .customerStatement(customerId)
      .then(setStatement)
      .catch(() => setStatement(null))
      .finally(() => setLoading(false));
  }, [customerId, online]);

  return (
    <Screen title="Outstanding Details" back>
      <Text style={type.small}>Customer</Text>
      <Text style={type.h2}>{customer?.name ?? '—'}</Text>

      <Card style={{ marginTop: spacing.lg }}>
        <Text style={type.small}>Total Outstanding</Text>
        <Money value={customer?.outstanding ?? aging.total} style={{ fontSize: 24, marginTop: 4 }} />
        {customer && Math.abs(customer.outstanding - aging.total) > 1 ? (
          <Text style={[type.tiny, { marginTop: 4 }]}>Invoices open: {money(aging.total)} · balance includes opening balance / on-account receipts</Text>
        ) : null}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <KeyValue label="0 - 30 Days" value={money(aging.b0_30)} />
        <Divider />
        <KeyValue label="31 - 60 Days" value={money(aging.b31_60)} />
        <Divider />
        <KeyValue label="61 - 90 Days" value={money(aging.b61_90)} />
        <Divider />
        <KeyValue label="90+ Days" value={money(aging.b90plus)} valueStyle={aging.b90plus > 0 ? { color: '#DC2626' } : undefined} />
      </Card>

      <Button title={showInvoices ? 'Hide Invoices' : 'View Invoices'} style={{ marginTop: spacing.lg }} onPress={() => setShowInvoices((s) => !s)} />

      {showInvoices ? (
        <Section title={`Open invoices (${open.length})`}>
          <Card style={{ padding: 0 }}>
            {open.map((inv) => (
              <ListItem key={inv.id} title={inv.invoiceNo} subtitle={`Invoiced ${fmtDate(inv.invoiceDate)} · Due ${fmtDate(inv.dueDate || inv.invoiceDate)}`} right={<Money value={inv.balance} />} />
            ))}
            {open.length === 0 ? (
              <View style={{ padding: spacing.lg }}>
                <Text style={type.small}>No open invoices.</Text>
              </View>
            ) : null}
          </Card>
        </Section>
      ) : null}

      <Section title="Recent receipts (from ERP ledger)">
        {!online ? <Notice tone="warning" text="Offline — receipt history is available when connected." /> : null}
        {loading ? <Text style={type.small}>Loading…</Text> : null}
        {statement ? (
          <Card style={{ padding: 0 }}>
            {statement.collectionHistory.slice(0, 10).map((r) => (
              <ListItem key={r.id} title={`${money(r.amount)}${r.paymentMode ? ` · ${r.paymentMode}` : ''}`} subtitle={`${fmtDate(r.date)} · ${r.voucherNo}${r.referenceNo ? ` · Ref ${r.referenceNo}` : ''}`} />
            ))}
            {statement.collectionHistory.length === 0 ? (
              <View style={{ padding: spacing.lg }}>
                <Text style={type.small}>No receipts recorded yet.</Text>
              </View>
            ) : null}
            <View style={{ padding: spacing.md }}>
              <KeyValue label="Ledger closing balance" value={money(statement.summary.closingBalance)} />
            </View>
          </Card>
        ) : null}
      </Section>
    </Screen>
  );
}
