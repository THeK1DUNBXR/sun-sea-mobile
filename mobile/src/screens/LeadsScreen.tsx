import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button, Card, EmptyState, Field, IconTile, ListItem, Notice, Pill } from '../components/ui';
import { Fab } from '../components/Fab';
import { PhotoBox } from '../components/PhotoBox';
import { useToast } from '../components/Toast';
import { tables } from '../db';
import { useQuery } from '../db/hooks';
import { colors, spacing, type } from '../theme';
import { fmtDateTime } from '../utils/format';
import type { CapturedPhoto } from '../utils/photos';
import type { RootStackParamList, ScreenProps } from '../navigation/types';
import { createLead, currentPosition } from '../data/extras';
import { success } from '../utils/haptics';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LeadsScreen() {
  const nav = useNavigation<Nav>();
  const leads = useQuery(() => tables.leads().query(Q.sortBy('created_at', Q.desc)), []);
  return (
    <Screen title="New outlets" back refreshable overlay={<Fab icon="add" label="Add outlet" onPress={() => nav.navigate('LeadNew')} />}>
      {leads.length === 0 ? (
        <EmptyState icon="storefront-outline" title="No new outlets yet" hint="Found a shop that should stock Sun Sea? Add it here — it is created in the ERP as a lead for the office to activate." />
      ) : (
        <Card style={{ padding: 0 }}>
          {leads.map((l) => (
            <ListItem
              key={l.id}
              leading={<IconTile icon="storefront-outline" tone={l.status === 'CREATED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'accent'} size={40} />}
              title={l.firmName}
              subtitle={`${[l.contactName, l.mobile, l.city].filter(Boolean).join(' · ')}\n${fmtDateTime(l.createdAt)}${l.customerCode ? ` · ${l.customerCode}` : ''}`}
              right={<Pill text={l.status === 'CREATED' ? 'In ERP' : l.status === 'REJECTED' ? 'Rejected' : 'Submitted'} tone={l.status === 'CREATED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'} />}
              onPress={l.customerId ? () => nav.navigate('CustomerDetail', { customerId: l.customerId! }) : undefined}
            />
          ))}
        </Card>
      )}
      <View style={{ height: 80 }} />
    </Screen>
  );
}

export function LeadNewScreen({ navigation }: ScreenProps<'LeadNew'>) {
  const toast = useToast();
  const [firm, setFirm] = useState('');
  const [contact, setContact] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Chennai');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [pos, setPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    setLocBusy(true);
    const p = await currentPosition();
    setLocBusy(false);
    if (p) {
      setPos(p);
      toast.show('Location captured');
    } else toast.show('Location unavailable — check permissions', 'warning');
  };

  const save = async () => {
    if (!firm.trim()) return Alert.alert('Shop name', 'Enter the outlet / firm name.');
    if (mobile && mobile.replace(/\D/g, '').length < 10) return Alert.alert('Mobile', 'Enter a 10-digit mobile number.');
    setBusy(true);
    try {
      await createLead({ firmName: firm, contactName: contact, mobile, addressLine: address, city, state: 'Tamil Nadu', pincode, gstin, notes, latitude: pos?.latitude, longitude: pos?.longitude, photos: photo ? [{ kind: 'OTHER', photo }] : [] });
      void success();
      toast.show('Outlet submitted to the office');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title="Add new outlet" back footer={<Button title="Submit outlet" onPress={save} loading={busy} />}>
      <Notice tone="info" text="The outlet is created in the ERP as a Lead. The office verifies it, sets grade and credit, and activates it — then it appears in your customer list." />
      <Field label="Shop / firm name *" value={firm} onChangeText={setFirm} placeholder="e.g. Murugan Stores" />
      <Field label="Contact person" value={contact} onChangeText={setContact} />
      <Field label="Mobile" value={mobile} onChangeText={(t) => setMobile(t.replace(/[^\d+ ]/g, ''))} keyboardType="phone-pad" />
      <Field label="Address" value={address} onChangeText={setAddress} placeholder="Door no., street, area" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Field label="City" value={city} onChangeText={setCity} style={{ flex: 1 }} />
        <Field label="Pincode" value={pincode} onChangeText={(t) => setPincode(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} style={{ width: 130 }} />
      </View>
      <Field label="GSTIN (optional)" value={gstin} onChangeText={(t) => setGstin(t.toUpperCase())} autoCapitalize="characters" maxLength={15} />
      <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconTile icon="location-outline" tone={pos ? 'success' : 'primary'} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{pos ? 'Location captured' : 'Shop location'}</Text>
          <Text style={type.tiny}>{pos ? `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}` : 'Stand at the shop and capture GPS for the route map'}</Text>
        </View>
        <Button small variant="outline" title={pos ? 'Recapture' : 'Capture'} onPress={capture} loading={locBusy} />
      </Card>
      <Text style={[type.h3, { marginBottom: spacing.sm }]}>Shop photo</Text>
      <PhotoBox label="" name={`lead-${Date.now()}`} photo={photo} onChange={setPhoto} hint="Shopfront with signboard" />
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Products interested in, expected monthly volume…" multiline />
      <Text style={[type.tiny, { color: colors.faint }]}>* required</Text>
    </Screen>
  );
}
