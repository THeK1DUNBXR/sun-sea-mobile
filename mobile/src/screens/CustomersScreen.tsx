import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { EmptyState, Field, ListItem, Money } from '../components/ui';
import { tables, Customer } from '../db';
import { useQuery } from '../db/hooks';
import { spacing, type } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CustomersScreen() {
  const nav = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const term = search.trim();
  const customers = useQuery(
    () =>
      tables.customers().query(
        ...(term
          ? [
              Q.or(
                Q.where('firm_name', Q.like(`%${Q.sanitizeLikeString(term)}%`)),
                Q.where('display_name', Q.like(`%${Q.sanitizeLikeString(term)}%`)),
                Q.where('customer_code', Q.like(`%${Q.sanitizeLikeString(term)}%`)),
                Q.where('city', Q.like(`%${Q.sanitizeLikeString(term)}%`)),
                Q.where('mobile', Q.like(`%${Q.sanitizeLikeString(term)}%`))
              ),
            ]
          : []),
        Q.sortBy('firm_name', Q.asc),
        Q.take(200)
      ),
    [term]
  );

  return (
    <Screen title="Customers" scroll={false} padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Field placeholder="Search name, code, city or mobile" value={search} onChangeText={setSearch} autoCorrect={false} />
      </View>
      <FlatList
        data={customers}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState icon="people-outline" title={term ? 'No matching customers' : 'No customers yet'} hint={term ? undefined : 'Run a sync to download the customer master.'} />}
        renderItem={({ item }: { item: Customer }) => (
          <ListItem
            title={item.name}
            subtitle={[item.customerCode, item.city].filter(Boolean).join(' · ')}
            onPress={() => nav.navigate('CustomerDetail', { customerId: item.id })}
            right={
              <View style={{ alignItems: 'flex-end' }}>
                <Money value={item.outstanding} />
                <Text style={type.tiny}>outstanding</Text>
              </View>
            }
          />
        )}
      />
    </Screen>
  );
}
