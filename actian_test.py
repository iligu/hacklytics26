import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="vectorai",
    user="admin",
    password="admin"
)

print("✅ Connected to Actian VectorAI!")
cur = conn.cursor()
cur.execute("SELECT version();")
print(cur.fetchone())
conn.close()