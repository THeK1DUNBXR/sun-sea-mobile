import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AttentionRow, Board, Panel, Pills, mono } from '../tv/primitives';
import { inrCompact, useTheme } from '../tv/theme';
import { attention, type Attention } from '../data/demo';

type Filter = 'all' | 'money' | 'ops';
const MONEY: Attention['kind'][] = ['APPROVAL', 'CREDIT', 'HANDOVER', 'PROMISE', 'CHEQUE'];
const LEVEL = { critical: 'CRITICAL', serious: 'HIGH', warning: 'MEDIUM', info: 'INFO' } as const;
const GROUP: Record<Attention['kind'], string> = { APPROVAL: 'ORDERS AWAITING APPROVAL', CREDIT: 'CREDIT', HANDOVER: 'CASH HANDOVERS', PROMISE: 'PROMISES TO PAY', CHEQUE: 'CHEQUES', STOCK: 'STOCK', DISPATCH: 'DISPATCH', PURCHASE: 'PURCHASES' };

export function AttentionScreen() {
  const { T, A } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const list = attention.filter((a) => (filter === 'all' ? true : filter === 'money' ? MONEY.includes(a.kind) : !MONEY.includes(a.kind)));
  const groups = Array.from(new Set(list.map((a) => a.kind)));
  const critical = attention.filter((a) => a.severity === 'critical').length;
  return (
    <Board scene="Management attention" back banner={{ level: critical ? 'alert' : 'ok', headline: critical ? `${critical} CRITICAL · ${attention.length} ITEMS FLAGGED` : `${attention.length} ITEMS FLAGGED` }} ticker={attention.map((a) => a.title.toUpperCase()).join('   ·   ')}>
      <Pills value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${attention.length}` }, { value: 'money', label: 'Money' }, { value: 'ops', label: 'Operations' }]} />
      {groups.map((g) => (
        <Panel key={g} title={GROUP[g]} accentBorder={list.some((a) => a.kind === g && a.severity === 'critical') ? A.red : undefined}>
          <View style={{ gap: 6 }}>
            {list
              .filter((a) => a.kind === g)
              .map((a) => (
                <View key={a.id}>
                  <AttentionRow level={LEVEL[a.severity]} text={a.title} right={a.amount ? inrCompact(a.amount) : undefined} />
                  <Text style={mono({ fontSize: 11, color: T.textDim, marginLeft: 74, marginTop: 3, marginBottom: 4 })}>
                    {a.detail} · {a.since}
                  </Text>
                </View>
              ))}
          </View>
        </Panel>
      ))}
      <Text style={mono({ fontSize: 11, color: T.textMute, textAlign: 'center', marginTop: 6 })}>Read-only. Approvals, confirmations and follow-ups are actioned by the office in the Sun Sea ERP.</Text>
    </Board>
  );
}
