/**
 * utils/mongo-client.mjs
 * Singleton MongoClient dla pj_sylabi @ localhost:27017
 */
import { MongoClient } from 'mongodb';

const URI = 'mongodb://admin:haslo123@localhost:27017/?authSource=admin';
export const DB_NAME = 'pj_sylabi';

let _client = null;

export async function getClient() {
  if (!_client) {
    _client = new MongoClient(URI);
    await _client.connect();
  }
  return _client;
}

export async function getDb() {
  const client = await getClient();
  return client.db(DB_NAME);
}

export async function closeClient() {
  if (_client) {
    await _client.close();
    _client = null;
  }
}
