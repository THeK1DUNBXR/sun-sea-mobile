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
import FollowUp from './models/FollowUp';
import DaySession from './models/DaySession';
import Handover from './models/Handover';
import Expense from './models/Expense';
import Lead from './models/Lead';
import Target from './models/Target';
import OrderHistory from './models/OrderHistory';

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
  modelClasses: [Customer, Invoice, Product, Route, RouteCustomer, Visit, Collection, Order, Attachment, FollowUp, DaySession, Handover, Expense, Lead, Target, OrderHistory],
});

export { Customer, Invoice, Product, Route, RouteCustomer, Visit, Collection, Order, Attachment, FollowUp, DaySession, Handover, Expense, Lead, Target, OrderHistory };

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
  followUps: () => database.get<FollowUp>('follow_ups'),
  daySessions: () => database.get<DaySession>('day_sessions'),
  handovers: () => database.get<Handover>('handovers'),
  expenses: () => database.get<Expense>('expenses'),
  leads: () => database.get<Lead>('leads'),
  targets: () => database.get<Target>('targets'),
  orderHistory: () => database.get<OrderHistory>('order_history'),
};

/** Wipes everything (used when a different agent logs in on the same device). */
export async function resetDatabase() {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}
