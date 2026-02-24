export class TrinoClient {
    constructor(user = 'admin') {
        this.user = user;
        this.headers = {
            'X-Trino-User': this.user,
            'Content-Type': 'text/plain',
        };
    }

    /**
     * Translates a Trino response URI to go through our Vite proxy.
     * e.g., http://localhost:8080/v1/statement/exp -> /api/trino/v1/statement/exp
     */
    _getProxyUri(uri) {
        if (!uri) return null;
        const url = new URL(uri);
        return `/api/trino${url.pathname}${url.search}`;
    }

    /**
     * Executes a SQL query against Trino and polls until completion.
     */
    async query(sql) {
        try {
            let response = await fetch('/api/trino/v1/statement', {
                method: 'POST',
                headers: this.headers,
                body: sql,
            });

            if (!response.ok) {
                throw new Error(`Trino request failed: ${response.statusText}`);
            }

            let data = await response.json();
            let allRows = [];
            let columns = [];

            // If data is returned immediately (rare for complex queries)
            if (data.columns && !columns.length) {
                columns = data.columns;
            }
            if (data.data) {
                allRows = allRows.concat(data.data);
            }

            // Poll until the query is finished
            while (data.nextUri) {
                // Wait a short amount before polling
                await new Promise((resolve) => setTimeout(resolve, 500));

                const proxyUri = this._getProxyUri(data.nextUri);
                response = await fetch(proxyUri, {
                    method: 'GET',
                    headers: this.headers,
                });

                if (!response.ok) {
                    throw new Error(`Trino poll failed: ${response.statusText}`);
                }

                data = await response.json();

                if (data.columns && !columns.length) {
                    columns = data.columns;
                }
                if (data.data) {
                    allRows = allRows.concat(data.data);
                }

                // Handle errors in query execution
                if (data.error) {
                    throw new Error(`Trino Error: ${data.error.message}`);
                }
            }

            // Map rows to objects using column names
            if (columns.length > 0) {
                return allRows.map((row) => {
                    const rowObj = {};
                    columns.forEach((col, index) => {
                        rowObj[col.name] = row[index];
                    });
                    return rowObj;
                });
            }

            return allRows;
        } catch (error) {
            console.error("Trino query error:", error);
            throw error;
        }
    }
}

export const trinoClient = new TrinoClient();
