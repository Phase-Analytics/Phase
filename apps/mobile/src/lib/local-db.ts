import * as SQLite from "expo-sqlite";

export function openLocalDb(name = "app.db") {
  return SQLite.openDatabaseAsync(name);
}
