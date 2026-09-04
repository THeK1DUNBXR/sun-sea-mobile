import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Pill, Screen, Segmented } from '../components/ui';
import { colors, spacing, type } from '../theme';
import { money } from '../format';
import { attention, type Attention } from '../data/demo';

type Filter = 'all' | 'money' | 'ops';
const ICON: Record<Attention['kind'], keyof typeof Ionicons.glyphMap> = { APPROVAL: 'checkmark-done-outline', CREDIT: 'card-outline', HANDOVER: 'briefcase-outline', PROMISE: 'alarm-outline', CHEQUE: 'document-text-outline', STOCK: 'cube-outline', DISPATCH: 'car-outline', PURCHASE: 'cart-outline' };
const SEV = { critical: ['Critical', 'danger'], serious: ['Serious', 'danger'], warning: ['Warning', 'warning'], info: ['Info', 'info'] } as const;
const MONEY: Attention['kind'][] = ['APPROVAL', 'CREDIT', 'HANDOVER', 'PROMISE', 'CHEQUE'];

export function AttentionScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const list = attention.filter((a) => (filter === 'all' ? true : filter === 'money' ? MONEY.includes(a.kind) : !MONEY.includes(a.kind)));
  return (
    <Screen title="Needs attention" subtitle={`${attention.length} items · handled in the ERP web app`} back>
      <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: `All (${attention.length})` }, { value: 'money', label: 'Money' }, { value: 'ops', label: 'Operations' }]} />
      <View style={{ height: spacing.md }} />
      {list.map((a) => (
        <Card key={a.id} style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: a.severity === 'critical' || a.severity === 'serious' ? colors.dangerSoft : a.severity === 'warning' ? colors.warningSoft : colors.infoSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={ICON[a.kind]} size={20} color={a.severity === 'critical' || a.severity === 'serious' ? colors.danger : a.severity === 'warning' ? colors.warning : colors.info} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={type.h3}>{a.title}</Text>
              <Text style={[type.small, { marginTop: 2 }]}>{a.detail}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' }}>
                <Pill text={SEV[a.severity][0]} tone={SEV[a.severity][1]} icon={a.severity === 'critical' ? 'alert-circle' : a.severity === 'serious' ? 'warning' : 'information-circle'} />
                <Pill text={a.since} tone="muted" icon="time-outline" />
                {a.amount ? <Text style={[type.h3, { marginLeft: 'auto' }]}>{money(a.amount)}</Text> : null}
              </View>
            </View>
          </View>
        </Card>
      ))}
      <Text style={[type.tiny, { textAlign: 'center', marginTop: spacing.md }]}>This app is read-only. Approvals, confirmations and follow-ups are actioned by the office in the Sun Sea ERP.</Text>
    </Screen>
  );
}
