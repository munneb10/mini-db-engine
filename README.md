# 🌳 MiniDB: Build Your Own Database Engine (with B+ Tree & Disk Pages)

> A tiny database engine, built from scratch in TypeScript with real disk-backed storage, page management, node splitting, and a B+ tree index like the ones inside PostgreSQL, MySQL, SQLite, and every major database you use every day.

---

## Story Why I Built a Database

Most engineers use databases daily:

* `SELECT * FROM users;`
* `INSERT INTO logs ...`
* `UPDATE orders ...`

…but almost no one ever asks:

> *What happens under the hood when I insert a key?
> How does a database find things so fast?
> How does it store data on disk?
> How does it stay sorted?
> How do B+ trees actually work?*

I was one of those people always using databases, never *understanding* them.

So I built **MiniDB**, a tiny storage engine that simulates the inner machinery of a real database:

* Pages written to disk
* B+ tree index (balanced, sorted, node splitting)
* Leaf-level linked list for fast range scans
* Real inserts, real searches, real disk I/O
* A CLI to play with it

This is not a toy.
This is a **baby version of a real database**, simplified so anyone can understand its soul.

---

# 🧱 What MiniDB Contains

### ✔️ Disk-backed storage engine

* A file (`data.db`)
* Fixed-size 4096-byte pages
* Read/write by page ID
* Page allocation like PostgreSQL’s storage layer

### ✔️ B+ Tree Index

* Leaf & internal nodes
* Sorted keys
* Node splitting
* Key promotion
* Balanced height
* Linked leaves for fast range scans

### ✔️ Simple Query Layer

Commands supported:

```
put <key> <value>
get <key>
range <start> <end>
```

### ✔️ Interactive CLI

So you can *see* how a database works while typing commands.

---

# 🔍 Visual Overview (Intuition Behind MiniDB)

## 🍎 Leaf nodes hold real data

```
[5 → "hello"] [12 → "world"] [20 → "foo"]
```

## 🧭 Internal nodes guide the search

```
          [10]
        /      \
  [5] [7]    [12] [20]
```

## 🌿 Leaves are linked for range scans

```
Leaf A → Leaf B → Leaf C → ...
```

This makes queries like:

```
range(10, 30)
```

blazingly fast.

---

# 🧠 How Insert Works (Baby Version)

1. Go to correct leaf
2. Insert key in sorted order
3. If leaf overflows → split it
4. Promote middle key to parent
5. If parent overflows → split again
6. If root overflows → create new root

This keeps the tree **balanced forever**.

That’s why B+ trees power real databases.

---

# 💾 File Structure (Exactly Like Real DBs)

MiniDB stores everything in a single file:

```
--------------------------------------------------
|  page 0  |  page 1  |  page 2  |  page 3  | ...
--------------------------------------------------
```

Each page is:

* 4096 bytes
* one B+ tree node
* encoded as JSON, padded to full page size
* read or written using offsets: `offset = pageId * pageSize`

This is literally the storage model of:

* PostgreSQL
* MySQL InnoDB
* SQLite

But massively simplified and easier to learn.

---

# 📦 Installation

```bash
git clone https://github.com/munneb10/mini-db-engine
npm install
npm run dev
```

---

# 🖥️ Usage (CLI)

```
mini-db> put 10 hello
mini-db> put 5 foo
mini-db> put 20 bar
mini-db> get 10
"hello"
mini-db> range 5 20
5 → "foo"
10 → "hello"
20 → "bar"
```

---

# 🚀 What You Learn By Reading This Code

### Database Internals

How actual databases store and index data on disk.

### Storage Systems

Understanding pages, offsets, and binary I/O.

### Balanced Trees

How B+ trees keep inserts and searches efficient.

### Range Queries

Why leaf-level links make B+ trees powerful.

### Data Structures

Node splitting, key promotion, recursion.

### System Design

Building layered architecture:
CLI → DB → B+ Tree → Pages → Disk

---

# 🧪 Example Scenario

Insert keys:

```
5, 10, 15, 20, 25
```

Watch tree grow:

```
First insert:
[10]

After 4 inserts:
[5, 10, 15, 20]

After 5th insert → split:
         [15]
      /          \
 [5,10]       [15,20,25]
```

This is **exactly** how PostgreSQL/MySQL maintain indexes.

---

# ❤️ Final Thoughts

MiniDB is my attempt to take the “black box” of a database and open it wide open.

If you’ve ever wondered:

* “How do indexes really work?”
* “How does data stay sorted?”
* “How can range queries be so fast?”
* “How does the DB store pages internally?”

This project answers all of that in a small, readable, hackable codebase.

It’s not meant to compete with PostgreSQL.

It’s meant to **teach** the internals that every engineer should understand.
