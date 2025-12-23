#!/usr/bin/env python3
"""Upload Thorney Island chunks to Neon database."""

import psycopg2
import sys
from parse_thorney import parse_thorney_island

# Neon connection string
CONN_STRING = "postgresql://neondb_owner:npg_0HmvsELjo8Gr@ep-ancient-violet-abx9ybhn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"

def main():
    chunks = parse_thorney_island('/Users/dankeegan/lost.london/public/Thorney Island Copy.md')
    print(f"Uploading {len(chunks)} chunks to Neon...")

    conn = psycopg2.connect(CONN_STRING)
    cur = conn.cursor()

    for chunk in chunks:
        cur.execute(
            "INSERT INTO thorney_island_knowledge (chunk_number, content) VALUES (%s, %s)",
            (chunk['chunk_number'], chunk['content'])
        )
        print(f"  Uploaded chunk {chunk['chunk_number']}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone! Uploaded {len(chunks)} chunks to thorney_island_knowledge table.")

if __name__ == '__main__':
    main()
