import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import Customer from './models/Customer';
import Invoice from './models/Invoice';
import Product from './models/Product';
import Route from './models/Route';
import RouteCustomer from './models/RouteCustomer';
import Visit from './models/Visit';
import Collection from './models/Collection';
import Order from './models/Order';
import Attachment from './models/Attachment';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'sunseafield',
  // JSI is used on iOS. On Android the JSI hook (JSIModulePackage) no longer
  // exists in React Native 0.74+, so the bridge adapter is used there.
  jsi: Platform.OS === 'ios',
  onSetUpError: (error) => {
    console.error('[db] failed to set up the local database', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Customer, Invoice, Product, Route, RouteCustomer, Visit, Collection, Order, Attachment],
});

export { Customer, Invoice, Product, Route, RouteCustomer, Visit, Collection, Order, Attachment };

export const tables = {
  customers: () => database.get<Customer>('customers'),
  invoices: () => database.get<Invoice>('invoices'),
  products: () => database.get<Product>('products'),
  routes: () => database.get<Route>('routes'),
  routeCustomers: () => database.get<RouteCustomer>('route_customers'),
  visits: () => database.get<Visit>('visits'),
  collections: () => database.get<Collection>('collections'),
  orders: () => database.get<Order>('orders'),
  attachments: () => database.get<Attachment>('attachments'),
};

/** Wipes everything (used when a different agent logs in on the same device). */
export async function resetDatabase() {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}
