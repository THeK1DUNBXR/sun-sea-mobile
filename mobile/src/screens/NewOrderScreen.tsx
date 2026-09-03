import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Screen } from '../components/Screen';
import { Button, EmptyState, Field, Pill, Stepper } from '../components/ui';
import { Chips } from '../components/Chips';
import { useToast } from '../components/Toast';
import { tables, Product } from '../db';
import { useQuery, useRecord } from '../db/hooks';
import { colors, radius, spacing, type } from '../theme';
import { money, round2 } from '../utils/format';
import type { OrderDraft, ScreenProps } from '../navigation/types';
import type { OrderLine } from '../api/types';
import { tap } from '../utils/haptics';

export function NewOrderScreen({ route, navigation }: ScreenProps<'NewOrder'>) {
  const { customerId, visitId, prefill } = route.params;
  const toast = useToast();
  const customer = useRecord(() => tables.customers().findAndObserve(customerId), [customerId]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const term = search.trim();
  const all = useQuery(() => tables.products().query(Q.where('is_active', true), Q.sortBy('product_name', Q.asc)), []);
  const history = useQuery(() => tables.orderHistory().query(Q.where('customer_id', customerId), Q.sortBy('order_date', Q.desc), Q.take(10)), [customerId]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const gradeName = customer?.gradeName ?? null;
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  // Prefill (repeat order) once products are loaded.
  useEffect(() => {
    if (!prefill || all.length === 0) return;
    setQty((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<string, number> = {};
      prefill.forEach((l) => {
        if (byId.has(String(l.productId))) next[String(l.productId)] = l.quantity;
      });
      return next;
    });
  }, [prefill, all.length, byId]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(all.map((p) => p.category).filter(Boolean) as string[])).sort()], [all]);
  const frequent = useMemo(() => {
    const count = new Map<string, number>();
    history.forEach((o) => o.items.forEach((i) => count.set(String(i.productId), (count.get(String(i.productId)) ?? 0) + 1)));
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => byId.get(id))
      .filter((p): p is Product => !!p);
  }, [history, byId]);

  const products = useMemo(() => {
    const t = term.toLowerCase();
    return all.filter((p) => (category === 'All' || p.category === category) && (!t || p.productName.toLowerCase().includes(t) || p.productCode.toLowerCase().includes(t)));
  }, [all, term, category]);

  const lines: (OrderLine & { rate: number })[] = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const p = byId.get(id);
          const rate = p ? p.rateFor(gradeName) : 0;
          return { productId: id, productName: p?.productName ?? id, quantity: q, uom: p?.uom ?? null, rate };
        }),
    [qty, byId, gradeName]
  );
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const total = round2(lines.reduce((s, l) => s + l.quantity * l.rate, 0));
  const belowMin = lines.filter((l) => (byId.get(l.productId)?.minQty ?? 0) > l.quantity);

  const setQ = (p: Product, v: number) => {
    const min = p.minQty || 0;
    let next = Math.max(0, v);
    if (next > 0 && next < min) {
      next = min;
      toast.show(`Minimum order for ${p.productName} is ${min}`, 'warning');
    }
    setQty((prev) => ({ ...prev, [p.id]: next }));
  };

  const review = () => {
    const draft: OrderDraft = { customerId, visitId, lines: lines.map(({ rate: _r, ...l }) => l) };
    navigation.navigate('OrderReview', { draft });
  };

  const renderProduct = (item: Product, compact = false) => {
    const rate = item.rateFor(gradeName);
    const q = qty[item.id] ?? 0;
    const stock = item.stockLevel;
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          void tap();
          setQ(item, (qty[item.id] ?? 0) + Math.max(1, item.minQty || 1));
        }}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: q > 0 ? colors.primarySoft : colors.card, minHeight: 72 }}
      >
        <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 48, height: 48 }} /> : <Ionicons name="cube-outline" size={24} color={colors.faint} />}
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={type.h3} numberOfLines={1}>
            {item.productName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <Text style={type.small}>
              {money(rate)}
              {item.uom ? ` / ${item.uom}` : ''}
            </Text>
            {!compact ? stock === 'out' ? <Pill text="Out of stock" tone="danger" /> : stock === 'low' ? <Pill text={`Low · ${item.onHandQty}`} tone="warning" /> : stock === 'in' ? <Pill text="In stock" tone="success" /> : null : null}
            {item.minQty > 1 ? <Text style={type.tiny}>min {item.minQty}</Text> : null}
          </View>
        </View>
        <Stepper value={q} onChange={(v) => setQ(item, v)} step={Math.max(1, item.minQty || 1)} />
      </Pressable>
    );
  };

  return (
    <Screen
      title="New Sale Order"
      subtitle={customer ? `${customer.name}${gradeName ? ` · ${gradeName} pricing` : ''}` : undefined}
      back
      scroll={false}
      padded={false}
      footer={
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={type.small}>
              {lines.length} item{lines.length === 1 ? '' : 's'} · {totalQty} units
            </Text>
            <Text style={[type.h3, { fontSize: 18 }]}>{money(total)}</Text>
          </View>
          {belowMin.length ? <Text style={[type.tiny, { color: colors.warning, marginBottom: 6 }]}>Below minimum: {belowMin.map((l) => l.productName).join(', ')}</Text> : null}
          <Button title="Review Order" onPress={review} disabled={lines.length === 0 || belowMin.length > 0} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Field placeholder="Search item / product code" value={search} onChangeText={setSearch} autoCorrect={false} style={{ marginBottom: spacing.sm }} />
        <Chips value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
      </View>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          !term && category === 'All' && frequent.length ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 }}>
                <Text style={type.label}>Frequently bought by this customer</Text>
                {history[0] ? (
                  <Pressable
                    onPress={() => {
                      const next: Record<string, number> = { ...qty };
                      history[0].items.forEach((l) => {
                        if (byId.has(String(l.productId))) next[String(l.productId)] = l.quantity;
                      });
                      setQty(next);
                      toast.show(`Repeated ${history[0].orderNo}`);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}
                  >
                    <Ionicons name="repeat" size={14} color={colors.primary} />
                    <Text style={[type.tiny, { color: colors.primary, fontWeight: '700' }]}>Repeat last order</Text>
                  </Pressable>
                ) : null}
              </View>
              {frequent.map((p) => renderProduct(p, true))}
              <Text style={[type.label, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 4 }]}>All products</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState icon="cube-outline" title={term ? 'No matching products' : 'No products yet'} hint={term ? undefined : 'Run a sync to download the product master.'} />}
        renderItem={({ item }) => renderProduct(item)}
        ListFooterComponent={
          lines.length ? (
            <Pressable onPress={() => setQty({})} style={{ alignSelf: 'center', paddingVertical: spacing.md, minHeight: 44 }}>
              <Text style={[type.small, { color: colors.danger, fontWeight: '700' }]}>Clear selection</Text>
            </Pressable>
          ) : null
        }
      />
    </Screen>
  );
}
