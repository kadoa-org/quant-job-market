import { useEffect, useState } from "react";
import initSqlJs from "sql.js";

// Self-hosted from public/ (copied from node_modules/sql.js/dist) so it loads
// same-origin — required by the strict CSP (connect-src 'self') on
// www.kadoa.com/quant. See kadoa-backend next.config.mjs.
const SQL_WASM_URL = `${import.meta.env.BASE_URL}sql-wasm.wasm`;
let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
      const response = await fetch(`${import.meta.env.BASE_URL}data/jobs.db`);
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
      .then((d) => {
        setDb(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
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
