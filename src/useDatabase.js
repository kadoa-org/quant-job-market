import { useEffect, useState } from "react";
import initSqlJs from "sql.js";

const SQL_WASM_URL = "https://sql.js.org/dist/sql-wasm.wasm";
let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
      const response = await fetch("/data/jobs.db");
      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    })();
  }
  return dbPromise;
}

export function useDatabase() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDb()
      .then((d) => { setDb(d); setLoading(false); })
      .catch((e) => { setError(e); setLoading(false); });
  }, []);

  return { db, loading, error };
}

export function query(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}
