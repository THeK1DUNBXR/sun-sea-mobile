import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Button, EmptyState, Field, KeyValue, Stepper } from '../components/ui';
import { tables, Product } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { money, round2 } from '../utils/format';
import type { OrderDraft, ScreenProps } from '../navigation/types';
import type { OrderLine } from '../api/types';

export function NewOrderScreen({ route, navigation }: ScreenProps<'NewOrder'>) {
  const { customerId, visitId } = route.params;
  const customer = useRecord(() => tables.customers().findAndObserve(customerId), [customerId]);
  const [search, setSearch] = useState('');
  const term = search.trim();
  const products = useQuery(
    () =>
      tables.products().query(
        Q.where('is_active', true),
        ...(term
          ? [Q.or(Q.where('product_name', Q.like(`%${Q.sanitizeLikeString(term)}%`)), Q.where('product_code', Q.like(`%${Q.sanitizeLikeString(term)}%`)))]
          : []),
        Q.sortBy('product_name', Q.asc),
        Q.take(150)
      ),
    [term]
  );
  const [qty, setQty] = useState<Record<string, number>>({});
  const gradeName = customer?.gradeName ?? null;

  const lines: (OrderLine & { rate: number })[] = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => {
        const p = byId.get(id) ?? cache.get(id);
        const rate = p ? p.rateFor(gradeName) : 0;
        return { productId: id, productName: p?.productName ?? id, quantity: q, uom: p?.uom ?? null, rate };
      });
  }, [qty, products, gradeName]);

  // Products can scroll out of the filtered list; remember what we've seen so totals stay right.
  const cache = useMemo(() => new Map<string, Product>(), []);
  products.forEach((p) => cache.set(p.id, p));

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const total = round2(lines.reduce((s, l) => s + l.quantity * l.rate, 0));

  const review = () => {
    const draft: OrderDraft = { customerId, visitId, lines: lines.map(({ rate: _r, ...l }) => l) };
    navigation.navigate('OrderReview', { draft });
  };

  return (
    <Screen
      title="New Sale Order"
      back
      scroll={false}
      padded={false}
      footer={
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={type.small}>Total Items: {totalQty}</Text>
            <Text style={type.h3}>Total Amount: {money(total)}</Text>
          </View>
          <Button title="Review Order" onPress={review} disabled={lines.length === 0} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={type.small}>Customer</Text>
        <Text style={type.h3}>{customer?.name ?? '—'}{gradeName ? `  ·  ${gradeName} pricing` : ''}</Text>
        <Field placeholder="Search item / product code" value={search} onChangeText={setSearch} autoCorrect={false} style={{ marginTop: spacing.sm }} />
      </View>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState icon="cube-outline" title={term ? 'No matching products' : 'No products yet'} hint={term ? undefined : 'Run a sync to download the product master.'} />}
        renderItem={({ item }) => {
          const rate = item.rateFor(gradeName);
          const q = qty[item.id] ?? 0;
          return (
            <Pressable onPress={() => setQty((p) => ({ ...p, [item.id]: (p[item.id] ?? 0) + 1 }))} style={{ paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: q > 0 ? colors.primarySoft : colors.card }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[type.h3, { flex: 1 }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={type.tiny}>{item.productCode}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={type.small}>
                  {money(rate)}
                  {item.uom ? ` / ${item.uom}` : ''}
                </Text>
                <Stepper value={q} onChange={(v) => setQty((p) => ({ ...p, [item.id]: Math.max(0, v) }))} />
                <Text style={[type.h3, { width: 90, textAlign: 'right' }]}>{q > 0 ? money(q * rate) : ''}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      {lines.length > 0 ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 6, backgroundColor: colors.bg }}>
          <KeyValue label={`${lines.length} item${lines.length > 1 ? 's' : ''} selected`} value={<Pressable onPress={() => setQty({})}><Text style={[type.small, { color: colors.danger }]}>Clear</Text></Pressable>} />
        </View>
      ) : null}
    </Screen>
  );
}
